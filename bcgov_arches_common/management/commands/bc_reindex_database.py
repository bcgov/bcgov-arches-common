from django.core.management.base import BaseCommand

from arches.app.models import models
from arches.app.models.system_settings import settings
from arches.app.utils.index_database import index_resources_by_type, index_concepts


class Command(BaseCommand):
    """
    Custom ES reindex command to take resource dependency into account
    """

    def get_index_order(self):
        """
        Override this function to provide indexes to order
        :return: Array of index names to rebuild
        """
        print("No indexes to process")
        return []

    def add_arguments(self, parser):
        parser.add_argument(
            "-q",
            "--quiet",
            action="store_true",
            dest="quiet",
            default=False,
            help="Silences the status bar output during certain operations, use in celery operations for example",
        )

        parser.add_argument(
            "-b",
            "--batch_size",
            action="store",
            dest="batch_size",
            type=int,
            default=settings.BULK_IMPORT_BATCH_SIZE,
            help="The number of records to index as a group, the larger the number the more memory required",
        )

        parser.add_argument(
            "-mp",
            "--use_multiprocessing",
            action="store_true",
            dest="use_multiprocessing",
            default=False,
            help="indexes the batches in parallel processes",
        )

        parser.add_argument(
            "-mxp",
            "--max_subprocesses",
            action="store",
            type=int,
            dest="max_subprocesses",
            default=0,
            help="Changes the process pool size when using use_multiprocessing. Default is ceil(cpu_count()/2)",
        )

        parser.add_argument(
            "-rd",
            "--recalculate-descriptors",
            action="store_true",
            dest="recalculate_descriptors",
            default=True,
            help="forces the primary descriptors to be recalculated before (re)indexing",
        )

    def handle(self, *args, **options):
        self.reindex_database(
            clear_index=True,
            batch_size=options["batch_size"],
            quiet=options["quiet"],
            use_multiprocessing=options["use_multiprocessing"],
            max_subprocesses=options["max_subprocesses"],
            recalculate_descriptors=options["recalculate_descriptors"],
        )

    def reindex_database(
        self,
        clear_index=True,
        batch_size=settings.BULK_IMPORT_BATCH_SIZE,
        quiet=False,
        use_multiprocessing=False,
        max_subprocesses=0,
        recalculate_descriptors=True,
    ):
        resource_types = (
            models.GraphModel.objects.filter(isresource=True)
            .exclude(graphid=settings.SYSTEM_SETTINGS_RESOURCE_MODEL_ID)
            .exclude(publication=None)
            .values_list("slug", "graphid")
        )

        # Create lookup of slug->graphs
        resource_types_lookup = {}
        for rt in resource_types:
            resource_types_lookup[rt[0]] = rt

        index_order = self.get_index_order()

        ordered_resource_types = []
        for i in index_order:
            if i in resource_types_lookup:
                ordered_resource_types.append(resource_types_lookup[i][1])

        # Add any resources not in the index order list
        for key, value in resource_types_lookup.items():
            if key not in index_order:
                ordered_resource_types.append(value[1])

        # Index concepts first
        if not quiet:
            print("Indexing concepts...")

        index_concepts(clear_index=clear_index, batch_size=batch_size)

        # Index resources in dependency order, but with multiprocessing within each type
        if not quiet:
            print(f"Indexing {len(ordered_resource_types)} resource types in dependency order...")
            if use_multiprocessing:
                print(f"Using multiprocessing with batch size {batch_size}, max subprocesses: {max_subprocesses}")

        # Process each resource type individually to maintain ordering
        for i, resource_type_uuid in enumerate(ordered_resource_types):
            if not quiet:
                resource_name = None

                for slug, (name, uuid) in resource_types_lookup.items():
                    if uuid == resource_type_uuid:
                        resource_name = slug
                        break

                print(f"Indexing resource type {i+1}/{len(ordered_resource_types)}: {resource_name}")

            # Index this single resource type with multiprocessing
            index_resources_by_type(
                [resource_type_uuid],  # Single resource type as list
                clear_index=(clear_index and i == 0),  # Only clear on first iteration
                batch_size=batch_size,
                quiet=quiet,
                use_multiprocessing=use_multiprocessing,
                max_subprocesses=max_subprocesses,
                recalculate_descriptors=recalculate_descriptors,
            )

        if not quiet:
            print("Reindexing completed!")

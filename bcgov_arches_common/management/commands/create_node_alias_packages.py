import logging
import re

from django.core.management.base import BaseCommand
from django.db import connection

from arches.app.models import models

logger = logging.getLogger(__name__)

EXCLUDED_SLUGS = {"arches_system_settings"}

# Matches WHEN 'alias' THEN 'uuid'::uuid lines in the generated CASE body.
_CASE_ROW_RE = re.compile(
    r"WHEN\s+'([^']+)'\s+THEN\s+'([0-9a-f-]+)'::uuid", re.IGNORECASE
)


class Command(BaseCommand):
    help = (
        "Creates PLPGSQL schemas that map node aliases to UUIDs for each graph. "
        "Each graph gets a schema named after its slug containing node_alias_uuid(text), "
        "an O(1) CASE-based lookup — e.g. drafts.node_alias_uuid('draft_data')."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "slugs",
            nargs="*",
            help=(
                "Graph slugs to process. If omitted, all eligible graphs are processed."
            ),
        )

    def handle(self, *args, **options):
        requested_slugs = options["slugs"]

        graphs_qs = models.GraphModel.objects.filter(isresource=True).exclude(
            slug__in=EXCLUDED_SLUGS
        )

        if requested_slugs:
            graphs_qs = graphs_qs.filter(slug__in=requested_slugs)
            found_slugs = set(graphs_qs.values_list("slug", flat=True))
            for slug in sorted(set(requested_slugs) - found_slugs):
                self.stderr.write(
                    self.style.WARNING(f"  No eligible graph found for slug: {slug}")
                )

        for graph in graphs_qs.order_by("slug"):
            self._process_graph(graph)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_existing_mapping(self, slug):
        """Return the alias->nodeid mapping from the live node_alias_uuid function, or {} if none."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = %s)",
                [slug],
            )
            if not cursor.fetchone()[0]:
                return {}

            cursor.execute(
                """
                SELECT p.prosrc
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = %s AND p.proname = 'node_alias_uuid' AND p.pronargs = 1
                """,
                [slug],
            )
            row = cursor.fetchone()
            if not row:
                return {}

            return {m.group(1): m.group(2) for m in _CASE_ROW_RE.finditer(row[0])}

    def _get_current_mapping(self, graph):
        """Return the alias->nodeid mapping from the live arches node table."""
        nodes = (
            models.Node.objects.filter(
                graph=graph,
                source_identifier__isnull=True,
            )
            .exclude(alias="")
            .values("alias", "nodeid")
            .order_by("alias")
        )
        return {n["alias"]: str(n["nodeid"]) for n in nodes}

    def _report_changes(self, slug, old_mapping, new_mapping):
        """Print a diff of alias changes to stdout and return whether anything changed."""
        added = sorted(set(new_mapping) - set(old_mapping))
        removed = sorted(set(old_mapping) - set(new_mapping))
        changed = sorted(
            alias
            for alias in set(new_mapping) & set(old_mapping)
            if new_mapping[alias] != old_mapping[alias]
        )

        if not old_mapping:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[{slug}] Creating new package ({len(new_mapping)} aliases)"
                )
            )
            return True

        if not (added or removed or changed):
            self.stdout.write(f"[{slug}] No changes.")
            return False

        self.stdout.write(self.style.SUCCESS(f"[{slug}] Changes detected:"))
        for alias in added:
            self.stdout.write(f"  + {alias}  ({new_mapping[alias]})")
        for alias in removed:
            self.stdout.write(f"  - {alias}  ({old_mapping[alias]})")
        for alias in changed:
            self.stdout.write(
                f"  ~ {alias}  {old_mapping[alias]} -> {new_mapping[alias]}"
            )
        return True

    def _build_package_sql(self, slug, mapping):
        """Generate the CREATE SCHEMA / CREATE FUNCTION SQL for the given mapping."""
        quoted = connection.ops.quote_name(slug)

        if mapping:
            case_branches = "\n            ".join(
                f"WHEN '{alias.replace(chr(39), chr(39)*2)}' THEN '{nodeid}'::uuid"
                for alias, nodeid in sorted(mapping.items())
            )
            case_expr = f"CASE p_alias\n            {case_branches}\n            ELSE NULL\n        END"
        else:
            case_expr = "NULL::uuid"

        return f"""\
CREATE SCHEMA IF NOT EXISTS {quoted};

-- O(1) lookup by alias name.
-- LANGUAGE sql + IMMUTABLE lets PostgreSQL inline and constant-fold this at plan time.
-- Usage: SELECT {slug}.node_alias_uuid('some_alias');
CREATE OR REPLACE FUNCTION {quoted}.node_alias_uuid(p_alias text)
    RETURNS uuid
    LANGUAGE sql IMMUTABLE AS
$$
    SELECT {case_expr};
$$;

-- Drop functions from previous versions of this command.
DROP FUNCTION IF EXISTS {quoted}.node_id(text);
DROP FUNCTION IF EXISTS {quoted}.aliases();
DROP FUNCTION IF EXISTS {quoted}.aliases(text);
DROP FUNCTION IF EXISTS {quoted}.get_alias_uuid(text);
"""

    def _process_graph(self, graph):
        slug = graph.slug
        old_mapping = self._get_existing_mapping(slug)
        new_mapping = self._get_current_mapping(graph)

        changed = self._report_changes(slug, old_mapping, new_mapping)
        if not changed:
            return

        sql = self._build_package_sql(slug, new_mapping)
        with connection.cursor() as cursor:
            cursor.execute(sql)

        self.stdout.write(self.style.SUCCESS(f"[{slug}] Package updated successfully."))

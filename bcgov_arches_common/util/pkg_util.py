import os
import json
from django.db import connection


def get_mapbox_spec_files():
    root_dir = os.path.dirname(__file__)
    map_specs = []

    for dir_path, dir_names, filenames in os.walk(
        os.path.join(root_dir, "..", "pkg", "map_layers")
    ):
        for filename in filenames:
            if filename.lower().endswith(".json"):
                spec_filename = os.path.join(dir_path, filename)
                with open(spec_filename, "r") as f:
                    try:
                        name = json.loads(f.read())["name"]
                        map_specs.append({"name": name, "path": spec_filename})
                    except:
                        print("Unable to load %s" % spec_filename)
    return map_specs


def update_map_source_prefix(prefix):
    app_prefix = "/" + prefix if not prefix.startswith("/") else prefix
    app_prefix = app_prefix[:-1] if app_prefix.endswith("/") else app_prefix
    with connection.cursor() as cursor:
        cursor.execute(
            """
        update map_sources set source = updated_source
            from (select *,
                   jsonb_set(source, '{tiles,0}',
                       ('"' || %(app_prefix)s || (source->'tiles'->>0) || '"')::jsonb) updated_source
                   from map_sources
            where source->'tiles'->>0 ~ '^/(bctileserver|bclocaltileserver)/')  a
            where map_sources.id = a.id;
        """,
            {"app_prefix": app_prefix},
        )

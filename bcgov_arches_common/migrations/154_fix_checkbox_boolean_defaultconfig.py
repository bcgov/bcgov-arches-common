from django.db import migrations

# cards_x_nodes_x_widgets records created when the widget's defaultconfig
# did not yet include defaultValue will have config->>'defaultValue' = null.
# The widgets.defaultconfig is now correct, but _.defaults() in card-widget.js
# only fills in keys that are undefined, so an explicit null in the saved record
# takes precedence and the null keeps getting round-tripped back to the DB.
fix_card_widget_configs_sql = """
UPDATE cards_x_nodes_x_widgets
SET config = jsonb_set(
    COALESCE(config, '{}'),
    '{defaultValue}',
    'false'
)
WHERE widgetid = (SELECT widgetid FROM widgets WHERE name = 'checkbox-boolean-widget')
  AND (
    config IS NULL
    OR (config -> 'defaultValue') IS NULL
    OR (config -> 'defaultValue') = 'null'::jsonb
  );
"""


class Migration(migrations.Migration):
    dependencies = [
        ("bcgov_arches_common", "2025-02-07_create_concept_functions"),
    ]

    operations = [
        migrations.RunSQL(fix_card_widget_configs_sql, migrations.RunSQL.noop),
    ]

from django.db import migrations
import os
from .util.migration_util import format_files_into_sql
from django.conf import settings

class Migration(migrations.Migration):
    dependencies = [("models","0001_initial")]

    username = settings.DATABASES["default"]["USER"]

    sql_dir = os.path.join(os.path.dirname(__file__), "sql", "2025")
    files = [
        format_files_into_sql("2025-02-06_import_vocabulary_item.sql", sql_dir).format(app_name= username),
        format_files_into_sql("2025-02-07_delete_flat_collection.sql", sql_dir).format(app_name= username),
        format_files_into_sql("2025-02-07_import_vocabulary_with_collection.sql", sql_dir).format(app_name= username),
        format_files_into_sql("2025-02-07_import_vocabulary_with_values.sql", sql_dir).format(app_name= username),
    ]

    operations = [
        migrations.RunSQL(files, migrations.RunSQL.noop),
    ]

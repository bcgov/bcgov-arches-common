-- Requires: app_owner parameter
drop function if exists import_vocabulary_item;
create or replace function import_vocabulary_item(p_parent_uuid uuid, p_child_label text, p_relationship text,
                                                  p_child_uuid uuid default uuid_generate_v4())
    returns uuid as
$$
DECLARE
BEGIN
    -- Add the vocabulary parent
    insert into concepts(conceptid, legacyoid, nodetype)
    values (p_child_uuid, 'http://localhost:8000/' || p_child_uuid::varchar, 'Concept');

    insert into values(valueid, value, conceptid, languageid, valuetype)
    values (uuid_generate_v4(), p_child_label, p_child_uuid, 'en', 'prefLabel');

    insert into values(valueid, value, conceptid, languageid, valuetype)
    values (uuid_generate_v4(), 'http://localhost:8000/' || p_child_uuid::varchar, p_child_uuid, 'en', 'identifier');

    insert into relations (conceptidfrom, conceptidto, relationtype)
    values (p_parent_uuid, p_child_uuid, p_relationship);

    return p_child_uuid;
END
$$
    language plpgsql;

DO
$$
    DECLARE
    BEGIN
        execute 'alter function public.import_vocabulary_item_with_collection owner to {app_name};';
    END
$$ language plpgsql;
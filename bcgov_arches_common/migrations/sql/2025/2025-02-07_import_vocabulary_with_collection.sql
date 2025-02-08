drop function if exists import_vocabulary_item_with_collection;
create or replace function import_vocabulary_item_with_collection(
    p_parent_concept_uuid uuid,
    p_child_label text,
    p_concept_relationship text default 'narrower',
    p_child_concept_uuid uuid default uuid_generate_v4(),
    p_parent_collection_uuid uuid default null,
    p_collection_relationship text default 'member',
    p_child_collection_uuid uuid default uuid_generate_v4())
    returns json as
$$
DECLARE
    l_identifier_prefix text = 'http://localhost:8000/';
BEGIN

    -- Returns a record with (child_concept_uuid, child_collection_uuid) values
    -- Add the vocabulary parent
    insert into concepts(conceptid, legacyoid, nodetype)
    values (p_child_concept_uuid, l_identifier_prefix || p_child_concept_uuid::varchar, 'Concept');

    insert into values(valueid, value, conceptid, languageid, valuetype)
    values (uuid_generate_v4(), p_child_label, p_child_concept_uuid, 'en', 'prefLabel');

    insert into values(valueid, value, conceptid, languageid, valuetype)
    values (uuid_generate_v4(), l_identifier_prefix || p_child_concept_uuid::text, p_child_concept_uuid, 'en',
            'identifier');

    raise Notice 'Trying to insert concept    element %->% (%)', p_parent_concept_uuid, p_child_concept_uuid, p_concept_relationship;
    insert into relations (conceptidfrom, conceptidto, relationtype)
    values (p_parent_concept_uuid, p_child_concept_uuid, p_concept_relationship);

    -- Add a concept for the collection
    if p_parent_collection_uuid is null then -- If it's null we need to create a value for the top level collection
        raise Notice 'Trying to insert top collection %, %', p_child_collection_uuid, p_child_label;
        insert into concepts(conceptid, legacyoid, nodetype)
        values (p_child_collection_uuid, p_child_collection_uuid, 'Collection');

        insert into values(valueid, value, conceptid, languageid, valuetype)
        values (uuid_generate_v4(), p_child_label, p_child_collection_uuid, 'en', 'prefLabel');

        insert into values(valueid, value, conceptid, languageid, valuetype)
        values (uuid_generate_v4(), l_identifier_prefix || p_child_collection_uuid::text, p_child_collection_uuid, 'en',
                'identifier');
    else
        raise Notice 'Trying to insert collection element %->% (%)\n', p_parent_collection_uuid, p_child_concept_uuid, p_collection_relationship;
        insert into relations (conceptidfrom, conceptidto, relationtype)
        values (p_parent_collection_uuid, p_child_concept_uuid, p_collection_relationship);
    end if;

    return json_build_object('concept_id', p_child_concept_uuid::text, 'collection_id', p_child_collection_uuid::text);
END
$$
    language plpgsql;

DO
$$
    DECLARE
    BEGIN
        execute 'alter function public.import_vocabulary_item_with_collection owner to {app_owner};';
    END
$$ language plpgsql;
drop procedure if exists delete_concept_and_children;
create or replace procedure delete_concept_and_children(concept_list_name text) as
$$
DECLARE
    row_value          record;
    concepts_to_delete uuid[];
begin
    /* Procedure to delete a concept and its children including associated collection values based on
     * the parent value. This procedure does not recursively traverse the hierarchy.
     */
    for row_value in (with concept_type as (select values.*, concepts.nodetype
                                            from values
                                                     join concepts on values.conceptid = concepts.conceptid
                                            where value = concept_list_name)
                      select 'Parent' concept_level, conceptid, value, valuetype, nodetype
                      from concept_type
                      union
                      select 'Child', concepts.conceptid, value, valuetype, nodetype
                      from values
                               join relations on values.conceptid = conceptidto
                               join concepts on values.conceptid = concepts.conceptid
                      where conceptidfrom in (select conceptid from concept_type)
                      order by 1)
        loop
            raise notice 'value: %', row_value;
            concepts_to_delete := array_append(concepts_to_delete, row_value.conceptid);
        end loop;
    delete from relations where conceptidfrom = any (concepts_to_delete) or conceptidto = any (concepts_to_delete);
    delete from values where conceptid = any (concepts_to_delete);
    delete from concepts where conceptid = any (concepts_to_delete);
end
$$ language plpgsql;

DO
$$
    DECLARE
    BEGIN
        execute 'alter procedure public.delete_concept_and_children owner to {app_owner};';
    END
$$ language plpgsql;
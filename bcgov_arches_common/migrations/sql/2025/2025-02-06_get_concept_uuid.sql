/* This gets the UUID for a concept with the given label and nodetype. */
/* This gets the top scheme for the application:  select get_concept_uuid('BC Thesauri', 'ConceptScheme'); */
/* This gets the concept parent: select get_concept_uuid('BC Hertage Function', 'Concept');     */
drop function if exists get_concept_uuid(p_label text, p_node_type text);
create or replace function get_concept_uuid(p_label text, p_node_type text)
    returns uuid as
$$
DECLARE
    parent_uuid uuid;
BEGIN
    select concepts.conceptid
    into parent_uuid
    from concepts,
         values
    where nodetype = p_node_type
      and value = p_label
      and values.conceptid = concepts.conceptid;
    return parent_uuid;
END
$$
    language plpgsql;

DO
$$
    DECLARE
    BEGIN
        execute 'alter function public.get_concept_uuid owner to {app_owner};';
    END
$$ language plpgsql;

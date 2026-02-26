from arches.app.search.elasticsearch_dsl_builder import (
    Bool,
    Match,
    Nested,
)
from arches.app.search.es_mapping_modifier import EsMappingModifier


class DisplayDescriptorSearchValue(EsMappingModifier):
    """
    The `DisplayDescriptorSearchValue` class extends the `EsMappingModifier` and is used
    to modify Elasticsearch mappings and queries to support the custom search functionality
    for display descriptors. It includes methods for adding search terms, creating nested
    filters, applying search filters, and returning mapping definitions configured to handle
    text fields and their variations like raw and folded formats.
    """

    custom_search_path = "display_descriptors"

    @staticmethod
    def initialize():
        pass

    @staticmethod
    def add_search_terms(resourceinstance, document, terms):
        if DisplayDescriptorSearchValue.custom_search_path not in document:
            document[DisplayDescriptorSearchValue.custom_search_path] = []
        for key in resourceinstance.descriptors.keys():
            if resourceinstance.descriptors[key].get("name"):
                document[DisplayDescriptorSearchValue.custom_search_path].append(
                    {
                        "display_descriptor": resourceinstance.descriptors[key].get(
                            "name"
                        )
                    }
                )

    @staticmethod
    def create_nested_custom_filter(term, original_element):
        if "nested" not in original_element:
            return original_element
        document_key = DisplayDescriptorSearchValue.custom_search_path
        custom_filter = Bool()
        custom_filter.should(
            Match(
                field="%s.display_descriptor" % document_key,
                query=term["value"],
                type="phrase_prefix",
            )
        )
        custom_filter.should(
            Match(
                field="%s.display_descriptor.folded" % document_key,
                query=term["value"],
                type="phrase_prefix",
            )
        )
        nested_custom_filter = Nested(path=document_key, query=custom_filter)
        new_must_element = Bool()
        new_must_element.should(original_element)
        new_must_element.should(nested_custom_filter)
        new_must_element.dsl["bool"]["minimum_should_match"] = 1
        return new_must_element

    @staticmethod
    def add_search_filter(
        search_query, term, permitted_nodegroups, include_provisional
    ):
        original_must_filter = search_query.dsl["bool"]["must"]
        search_query.dsl["bool"]["must"] = []
        for must_element in original_must_filter:
            search_query.must(
                DisplayDescriptorSearchValue.create_nested_custom_filter(
                    term, must_element
                )
            )

        original_must_filter = search_query.dsl["bool"]["must_not"]
        search_query.dsl["bool"]["must_not"] = []
        for must_element in original_must_filter:
            search_query.must_not(
                DisplayDescriptorSearchValue.create_nested_custom_filter(
                    term, must_element
                )
            )
        # print("Search query after: %s" % search_query)

    @staticmethod
    def get_mapping_definition():
        return {
            "type": "nested",
            "properties": {
                "display_descriptor": {
                    "type": "text",
                    "fields": {
                        "raw": {"type": "keyword", "ignore_above": 256},
                        "folded": {"type": "text", "analyzer": "folding"},
                    },
                }
            },
        }

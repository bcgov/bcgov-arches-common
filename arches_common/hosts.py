import re
from django_hosts import patterns, host

host_patterns = patterns(
    "",
    host(
        re.sub(r"_", r"-", r"arches_common"), "arches_common.urls", name="arches_common"
    ),
)

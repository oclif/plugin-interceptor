plugin-interceptor
============

Plugin that defines a pre-run hook that can record and mock http/s requests and responses during command execution based on an environment variable.  Recorded requests are written to files based on the command name and topic.  Commands can then use the recorded fixtures rather than making actual network calls.  All `setTimeout` calls can also be mocked so as to return on next tick, which is useful when using mocked responses.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@oclif/plugin-interceptor.svg)](https://npmjs.org/package/@oclif/plugin-interceptor)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/plugin-interceptor.svg)](https://npmjs.org/package/@oclif/plugin-interceptor)
[![License](https://img.shields.io/npm/l/@oclif/plugin-interceptor.svg)](https://github.com/oclif/plugin-interceptor/blob/main/package.json)

# Usage
This plugin does nothing until enabled with the `INTERCEPTOR_MODE` environment variable.

# Environment Variables

| Env Var | Description |
| --- | --- |
| INTERCEPTOR_MODE | Set to `record` to record HTTP/S requests made by commands.  Set to `mock` to use the recorded fixtures. |
| INTERCEPTOR_QUIET | Set to `true` to suppress console output. |
| INTERCEPTOR_DISABLE_TIMEOUTS | By default the `setTimeout` function is overridden to execute the callback on next tick, which is useful when using recorded fixtures.  Set to `false` to prevent this behavior. |
| INTERCEPTOR_DISABLE_NET_CONNECT | By default all unexpected HTTP/S requests when in `mock` mode are blocked and will cause an error.  Set to `false` to allow these requests to be made. |
| INTERCEPTOR_SCOPE_OVERRIDE | It can be useful to override the scope (protocol + domain + port) of the recorded requests to match a known scope.  E.g., "https://my.test.domain:443" |
| INTERCEPTOR_MAX_POST_BODY | Multipart POST request bodies can be very large and cause problems with request matching. By default all POST request bodies are not written to the fixture for matching.  This behavior can be modified by setting a body character length threshold where the request body will only be written when the length is less than the threshold.  E.g., `INTERCEPTOR_MAX_POST_BODY=5000` |
| INTERCEPTOR_OUTPUT_DIR | By default the current working directory is used as the base path for writing and using fixtures.  To set this to another location use this env var. |
| INTERCEPTOR_FIXTURE_NAME | By default the interceptor uses the name of the command for the directory where fixtures are written to and read from.  Use this variable to set the name to something else. |
| INTERCEPTOR_HOME_DIR | It can be useful to override the home directory of the OS to another location for mocking purposes.  Set this variable to some path to achieve this behavior. |

plugin-interceptor
============

Plugin that defines a pre-run hook that can record and mock http/s requests and responses during command execution.  Recorded requests are written to files based on the command name and topic.  Commands can then use the recorded fixtures rather than making actual network calls.  All setTimeout calls can also be mocked so as to return on next tick, which is useful when using mocked responses.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/command-perf.svg)](https://npmjs.org/package/command-perf)
[![Downloads/week](https://img.shields.io/npm/dw/command-perf.svg)](https://npmjs.org/package/command-perf)
[![License](https://img.shields.io/npm/l/command-perf.svg)](https://github.com/shetzel/command-perf/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g plugin-interceptor
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
plugin-interceptor/1.0.0 darwin-x64 node-v12.8.1
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->

<!-- commandsstop -->

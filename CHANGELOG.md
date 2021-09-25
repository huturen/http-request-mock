### Changelog
[2021-09-25]
1. add umd bundles for browser

[2021-09-19]
1. add a plain html example

[2021-09-10]
1. mock directory supports a maximum of 4 sub-levels
2. replace fs.watch with chokidar

[2021-09-02]
1. clientRequest.end should return an instance of ClientRequest
2. pretty log
3. dynamic import http-request-mock dependency for .runtime.js

[2021-09-01]
1. integrate with faker.js
2. fallback to nodejs native http/https request if not matched for fetch, xhr and wx in unit test enviroment


[2021-08-28]
1. support to bypass a mock request

[2021-08-20]
1. add runtime plugin
2. add `--type` option to cli

[2021-08-20]
1. add continuous integration

[2021-08-19]
1. add English version of the README.md

[2021-08-17]
1. fix a typo: inteceptor -> interceptor

[2021-08-14]
1. add react and vue examples
2. `http-request-mock-cli -w` supports a customized command to start a mock development

[2021-08-13]
1. add init and watch option for command tool
2. remove 'runtime' option for webpack plugin

[2021-08-12] mock response option supports asynchronous function

[2021-08-11]
1. add mock times options for a limited number of times mocking
2. remove 'verbose' value for runtime option
3. normalize request info for all interceptors
4. windows compatibility

[2021-08-09] fix wx.request binding error

[2021-08-08]
1. support http.get, https.get, http.reuest, https.request request mock
2. support to enable/disable mock function temporarily
3. add unit tests for node-fetch, ky, request, got libraries.

[2021-07-30] fix command tool problem & release v1.1.4

[2021-07-24] change custom to verbose for runtime config option

[2021-07-18] add query for request info

[2021-07-17] response supports to get request header for xhr

[2021-07-12] add command tool for generating mock config entry file

[2021-06-26] add superagent unit test

[2021-06-24] add jquery unit test

[2021-06-12] add xhr, wx.request, fetch, axios unit test

[2021-06-10] fully support fetch request mock

[2021-05-25] add load loadend event trigger

[2021-04-30] add http status code & http response header mock

[2021-04-29] add wx.request interceptor, preparing fetch interceptor

[2021-03-29] init http-request-mock, add XMLHttpRequest interceptor

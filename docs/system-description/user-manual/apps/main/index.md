# Instructions for the AI
## Scope and Purpose of this Documentation
Please document the current functionality and architecture of the "Main" app here. This document should strictly document the current functionality of the app as it is implemented now. Don't include any planned features or possible new features.

Since this is the page describing the app itself it is called index.md. All relevant, non trial sub-apps or sub components of this app have their own naming scheme described below. 

Please keep the documentation short if possible. But don't leave out relevant details just for the sake of keeping the documentation short. The documentation should be complete. 

Focus on the use cases that are relevant for developers and users of the system. Explain how the developer perspective and the user perspective come together so developers and users can find and use a common language. 

The main audience of the documentation are the developers but it should be understandable for technically minded users as well. 

Please document the types|interfaces|data structures|etc. in index__types.md and the (non trivial) implementation details in index__implementation.md

### Deciding what details to include
By reading the documentation a developer should be able to understand the architecture of the app and a user should be able to find out about all features the app supports. 

#### These details need to be included in the documentation
Ensure that these details are definitely included in the documentation:
* The different coordinate systems that are used in the app.
* All kinds of user interactions that are supported by the app. 

## Documenting Sub-Apps
The following section is about how sub-apps of the app described in this document ought to be documented. It uses the sub-app "Grid Controls" as a specific example but it is, of course, meant to describe the general way for documenting sub-apps:

To ensure this document is well structured and does not loose focus by describing small details please use separate files to describe the sub-apps. This way it is enough to just reference the sub-apps in this and other documents. Referencing a sub-app should be done like this:

"Grid Controls" (put the name of the sub-app in quotation marks to clearly distinguish between normal text and a references to a specific sub-app)

The naming scheme for documenting the sub-apps of this app goes like this: 

* the current functionality of the sub-app should be documented in grid-controls.md
* any specific typescript types/interfaces/data structures/etc. should be documented in grid-controls__types.md (only create this file if it is really needed. Some sub-apps might not have any special types).
* any specific implementation detail that is not trivial should be documented in grid-controls__implementation.md (only create this file if it is really needed. Some sub-apps might not have any non trivial implementation details worth mentioning).

## Links between Files
When referencing something that is described in another file please create links to the referenced file like this:
["Grid Controls"](./grid-controls.md)

Use a clear and consistent linking scheme. All separate files in the documentation must be reachable via links. So please ensure that no file is orphaned. Also ensure that it is always possible to get back to where one came from via clicking a link. So there must not be any dead ends in the navigation between files. It is not necessarily required to be able to reach every file from every other file so please only link what is relevant.

## FAQ for the AI
* If anything is unclear please just ask.
* Please keep these instructions as they are and only make changes below the line that follows. Don't use any lines in the documentation except to keep the instructions for the AI separated from the documentation itself.
---
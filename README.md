# Delete Consult Transfer Recordings tool

This tool scans a Genesys Cloud organization using your own credentials and lists recordings that have been affected by a Genesys Cloud bug which caused external transfers to be recorded.

The following logic is used to find recordings that should be deleted:

- We first run an analytics query with the following filters:
  - Conversation Filters:
    - nConsultTransferred >= 1
  - Segment Filters
    - mediaType = "voice"
    - direction = "outbound"
    - segmentType = "interact"
- This returns calls that have at least one consult transfer and at least one outbound call that got connected. The full analytics query is in the `getAnalyticsConversations()` function in the `recordings.js` file.
- This output from that query is a preliminary list of conversations. However, more rules must be applied to get the correct list of affected conversations:
  - If a participant with `purpose` set to `customer` has the following conditions:
    - A session with `dnis` different than `sessionDnis`, indicating that the call was transferred
    - The last segment of that session has `segmentType` set to `interact`, indicating that the transferred call was connected.
  - Then the conversation qualifies for recordings that need to be deleted

## How to use

- Get a user and a password to login into the affected Genesys Cloud organization with the following permissions:
  - Recording > All Permissions
  - ![Recording Permission](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/recordingpermission.png "Recording Permission")
  - Analytics > All Permissions
  - ![Analytics Permission](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/analyticspermission.png "Analytics Permission")

- Go to [https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html](https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html)

![Login Screen](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/loginscreen.png "Login Screen")

- Select your Genesys Cloud region
- Click on `Login` and login using your own credentials if necessary
- Set a date range to search for recordings and click on `Search`
- You can optionally set a phone number that calls were transferred to, to limit the number of results

![Main Screen](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/mainscreen.png "Main Screen")

- It can take a while to retrieve all recordings so be patient and do not close the page
- Once conversations show up, you can delete the recordings that qualify by clicking the button with the recording id

![Recordings](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/recordings.png "Recordings")

- Recordings will have their `deleteDate` set to the previous day. This will not show immediately as the archiving can take a few minutes.
- You can audit your own requests by clicking on the `Show My Activity` button at the top of the page

![My Activity](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/myactivity.png "My Activity")

## How to troubleshoot

Use your browser console and network tools to troubleshoot issues:

Here is an example of a process without errors:

- Running Analytics queries to get all conversations in the specified date/time range:

```log
recordings.js:154 Running analytics query: {interval: "2020-12-16T00:00:00.000Z/2021-01-15T00:00:00.000Z", order: "asc", orderBy: "conversationStart", paging: {…}, segmentFilters: Array(1), …}
recordings.js:154 Running analytics query: {interval: "2020-12-16T00:00:00.000Z/2021-01-15T00:00:00.000Z", order: "asc", orderBy: "conversationStart", paging: {…}, segmentFilters: Array(1), …}
recordings.js:180 Got conversations: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
```

- Going through each conversation and applying multiple filters (see top of this README for details):

```log
recordings.js:207 Conversation: 6f1f2a73-475b-412c-be27-3ef853711499 - Starting analysis...
recordings.js:211 Conversation: 6f1f2a73-475b-412c-be27-3ef853711499 - Participants with purpose set to customer or external:  (2) [{…}, {…}]
recordings.js:219 Conversation: 6f1f2a73-475b-412c-be27-3ef853711499 - Participant: 3b94e2fe-3d20-4c48-a4d1-151793b5803e - No sessions found with an external transfer
recordings.js:217 Conversation: 6f1f2a73-475b-412c-be27-3ef853711499 - Participant: c672edce-ec0c-4c9d-8ac6-80864a03f4ae - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 6f1f2a73-475b-412c-be27-3ef853711499 - Participant: c672edce-ec0c-4c9d-8ac6-80864a03f4ae - Session: 43309599-1671-457f-a55c-660613f6eb8f - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Starting analysis...
recordings.js:211 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participants with purpose set to customer or external:  (3) [{…}, {…}, {…}]
recordings.js:219 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participant: 4e443c46-79f3-401d-9620-4a55cff706e9 - No sessions found with an external transfer
recordings.js:217 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participant: 2304d3f2-59ec-482f-add9-e36fb24c1874 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participant: 2304d3f2-59ec-482f-add9-e36fb24c1874 - Session: 6f9f29b4-7078-4bee-a674-281d99c63c67 - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:217 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participant: 8ea0221b-081a-41d9-b524-a49b1d7d23cd - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 4ad737fa-243e-4b84-a1e3-b84500e38da0 - Participant: 8ea0221b-081a-41d9-b524-a49b1d7d23cd - Session: 28b43a38-fe6a-4c35-97e9-72acb969ee0d - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: ce3cfe4f-c646-4443-9a63-2d266ce39d8c - Starting analysis...
recordings.js:211 Conversation: ce3cfe4f-c646-4443-9a63-2d266ce39d8c - Participants with purpose set to customer or external:  (2) [{…}, {…}]
recordings.js:219 Conversation: ce3cfe4f-c646-4443-9a63-2d266ce39d8c - Participant: 24c3f3d0-4c30-40d0-9f79-589aac8cde93 - No sessions found with an external transfer
recordings.js:217 Conversation: ce3cfe4f-c646-4443-9a63-2d266ce39d8c - Participant: a86a23d0-b6c9-4eac-a3aa-7c322abc1606 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: ce3cfe4f-c646-4443-9a63-2d266ce39d8c - Participant: a86a23d0-b6c9-4eac-a3aa-7c322abc1606 - Session: 830a95d8-ae52-400c-9dc8-71d10149b61b - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: cb3b5d7b-ec96-4b6c-9735-bbb511f659dc - Starting analysis...
recordings.js:211 Conversation: cb3b5d7b-ec96-4b6c-9735-bbb511f659dc - Participants with purpose set to customer or external:  (2) [{…}, {…}]
recordings.js:219 Conversation: cb3b5d7b-ec96-4b6c-9735-bbb511f659dc - Participant: c83bb314-58c0-4dd9-ae1a-87a5ab98bd04 - No sessions found with an external transfer
recordings.js:217 Conversation: cb3b5d7b-ec96-4b6c-9735-bbb511f659dc - Participant: 4c9ca59d-b593-46cd-82f4-b01c44211653 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: cb3b5d7b-ec96-4b6c-9735-bbb511f659dc - Participant: 4c9ca59d-b593-46cd-82f4-b01c44211653 - Session: 358c87b7-eb37-4ac9-933f-1bb54a78b3ae - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: 93e2fa84-a2cf-47c0-b2e9-e6765cfa53df - Starting analysis...
recordings.js:211 Conversation: 93e2fa84-a2cf-47c0-b2e9-e6765cfa53df - Participants with purpose set to customer or external:  (2) [{…}, {…}]
recordings.js:219 Conversation: 93e2fa84-a2cf-47c0-b2e9-e6765cfa53df - Participant: 6e0e8766-4244-4036-8954-2dac3e876621 - No sessions found with an external transfer
recordings.js:217 Conversation: 93e2fa84-a2cf-47c0-b2e9-e6765cfa53df - Participant: 0213cb8f-e6a1-4462-bbd7-7a051f740bb1 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 93e2fa84-a2cf-47c0-b2e9-e6765cfa53df - Participant: 0213cb8f-e6a1-4462-bbd7-7a051f740bb1 - Session: 4f0d85f3-d3bd-4cb1-97c7-987f007d97bd - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: ed5efa3d-ef89-4578-bce8-fb79641ad763 - Starting analysis...
recordings.js:211 Conversation: ed5efa3d-ef89-4578-bce8-fb79641ad763 - Participants with purpose set to customer or external:  [{…}]
recordings.js:219 Conversation: ed5efa3d-ef89-4578-bce8-fb79641ad763 - Participant: 27089758-2ffb-436a-a423-d3f76dfdf36f - No sessions found with an external transfer
recordings.js:207 Conversation: edee9ad6-f2b7-4571-8513-8c740e36ba88 - Starting analysis...
recordings.js:211 Conversation: edee9ad6-f2b7-4571-8513-8c740e36ba88 - Participants with purpose set to customer or external:  (2) [{…}, {…}]
recordings.js:219 Conversation: edee9ad6-f2b7-4571-8513-8c740e36ba88 - Participant: 98962d95-4e6a-4bdb-bbdb-ee731b6704a5 - No sessions found with an external transfer
recordings.js:217 Conversation: edee9ad6-f2b7-4571-8513-8c740e36ba88 - Participant: 9c8dc6b6-5a95-4e03-92c3-565a8e50ae71 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: edee9ad6-f2b7-4571-8513-8c740e36ba88 - Participant: 9c8dc6b6-5a95-4e03-92c3-565a8e50ae71 - Session: c2c10014-eee6-4e1a-868f-08c62a3f0ae4 - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:207 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Starting analysis...
recordings.js:211 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participants with purpose set to customer or external:  (3) [{…}, {…}, {…}]
recordings.js:219 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participant: 1ff97eb2-a8eb-479d-8c89-49dc18d9d76d - No sessions found with an external transfer
recordings.js:217 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participant: 0a140666-8dfe-4c2f-af7e-ae2e3aeea2da - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participant: 0a140666-8dfe-4c2f-af7e-ae2e3aeea2da - Session: e1e6c61c-9bf4-4353-84e6-cf280a902de4 - Recording for this session needs to be deleted (segmentType = 'interact')
recordings.js:217 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participant: b856972b-d83e-4316-9d35-0c79b873fec4 - Found session(s) with an external transfer: [{…}]
recordings.js:234 Conversation: 57dc7c6d-6b83-4f5b-a3af-bc4856bb451e - Participant: b856972b-d83e-4316-9d35-0c79b873fec4 - Session: 6906e8b0-81af-4530-8686-10c84922034a - Recording for this session needs to be deleted (segmentType = 'interact')
```

- Output of conversations that qualify (having at least one recording that needs to be deleted)

```log
recordings.js:239 Filtered Conversations: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
```

- After getting all recordings, this final entry shows all data

```log
recordings.js:279 Conversations with recordings: (8) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
```

To enable more logging, set the logging level to `Verbose`

![Verbose Logging](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/verboselogging.png "Verbose Logging")

You can also use the `Network` tab to view all ongoing requests:

![Network Logging](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/network.png "Network Logging")

## Developers

- Clone this repository
- Start a web server (or use VSCode live server extension)

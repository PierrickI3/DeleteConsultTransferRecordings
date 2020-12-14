# DeleteConsultTransferRecordings

This tool scans a Genesys Cloud organization using your own credentials and lists recordings that have been affected by the ? bug which caused external transfers to be recorded.

TODO:

- Add screenshots

## How it works

- Runs an analytics query with the following filters:
  - Conversation Filters:
    - nConsultTransferred >= 1
  - Segment Filters
    - direction = "outbound"
    - segmentType = "interact"

The full analytics query is in the `js/recordings.js` in the `getAnalyticsConversations()` function.

This output from that query is a preliminary list of conversations. However, more rules must be followed to get the correct list of affected recordings:

- The last Participant of the conversation must have `purpose` set to `customer`.
- The last session of the last participant must have its `dnis` and `sessionDnis` properties with different values (happens when a transfer occurs).
- The last segment of that last session must have `segmentType` = `interact` to show that the transferred call connected.

## How to use

- Go to [https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html](https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html)

![Login Screen](https://github.com/PierrickI3/DeleteConsultTransferRecordings/tree/master/assets/brand/loginscreen.png "Login Screen")

- Select your Genesys Cloud region
- Click on `Login` and login using your own credentials if necessary
- Set a date range to search for recordings and click on `Search`
- You can optionally set a phone number that calls were transferred to, to limit the number of results

![Main Screen](https://github.com/PierrickI3/DeleteConsultTransferRecordings/tree/master/assets/brand/mainscreen.png "Main Screen")

- It can take a while to retrieve all recordings so be patient and do not close the page
- Once conversations show up, you can delete the `Last Recording` for each conversation by clicking the button at the end of each row

![Recordings](https://github.com/PierrickI3/DeleteConsultTransferRecordings/tree/master/assets/brand/recordings.png "Recordings")

- Recordings will have their `deleteDate` set to the previous day. This will not show immediately as the archiving can take a few minutes.
- You can audit your own requests by clicking on the `Show My Activity` button at the top of the page

![My Activity](https://github.com/PierrickI3/DeleteConsultTransferRecordings/tree/master/assets/brand/myactivity.png "My Activity")

## Developers

- Clone this repository
- Start a web server (or use VSCode live server extension)

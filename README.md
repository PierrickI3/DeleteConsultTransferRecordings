# DeleteConsultTransferRecordings

This tool scans a Genesys Cloud organization using your own credentials and lists recordings that have been affected by a Genesys Cloud bug which caused external transfers to be recorded.

## How it works

- Runs an analytics query with the following filters:
  - Conversation Filters:
    - nConsultTransferred >= 1
  - Segment Filters
    - mediaType = "voice"
    - direction = "outbound"
    - segmentType = "interact"

This returns calls that have at least one consult transfer and at least one outbound call that got connected. The full analytics query is in the `getAnalyticsConversations()` function in the `recordings.js` file.

This output from that query is a preliminary list of conversations. However, more rules must be applied to get the correct list of affected conversations:

- If a participant with `purpose` set to `customer` has the following conditions:
  - A session with `dnis` different than `sessionDnis`, indicating that the call was transferred
  - The last segment of that session has `segmentType` set to `interact`, indicating that the transferred call was connected.
- Then the conversation qualifies for recordings that need to be deleted

## How to use

- Go to [https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html](https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html)

![Login Screen](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/loginscreen.png "Login Screen")

- Select your Genesys Cloud region
- Click on `Login` and login using your own credentials if necessary
- Set a date range to search for recordings and click on `Search`
- You can optionally set a phone number that calls were transferred to, to limit the number of results

![Main Screen](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/mainscreen.png "Main Screen")

- It can take a while to retrieve all recordings so be patient and do not close the page
- Once conversations show up, you can delete the `Last Recording` for each conversation by clicking the button at the end of each row

![Recordings](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/recordings.png "Recordings")

- Recordings will have their `deleteDate` set to the previous day. This will not show immediately as the archiving can take a few minutes.
- You can audit your own requests by clicking on the `Show My Activity` button at the top of the page

![My Activity](https://raw.githubusercontent.com/PierrickI3/DeleteConsultTransferRecordings/master/assets/brand/myactivity.png "My Activity")

## Developers

- Clone this repository
- Start a web server (or use VSCode live server extension)

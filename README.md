# DeleteConsultTransferRecordings

This tool scans a Genesys Cloud organization using your own credentials and lists recordings that have been affected by the ? bug which caused external transfers to be recorded.

TODO:

- Add screenshots
- Add audit trail of recordings that were deleted

## How to use

- Go to [https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html](https://pierricki3.github.io/DeleteConsultTransferRecordings/index.html)
- Select your Genesys Cloud organization
- Login using your own credentials
- Set a date range to search for recordings and click on `Search`
- It can take a while to retrieve all recordings so be patient and do not close the page
- Once conversations show up, you can delete the `Last Recording` for each conversation

## Developers

- Clone this repository
- Start a web server (or use VSCode live server extension)

'use strict';

//#region Initialization

let results = {};
let divisions = [];

// Get Genesys Cloud credentials
let token = localStorage.getItem('access_token');
let environment = localStorage.getItem('environment');

// Configure toast
$('.toast').toast({
  delay: 10000
});

// Configure date pickers
$('#sandbox-container .input-daterange').datepicker({
  format: "yyyy-mm-ddT00:00:00Z",
  todayBtn: "linked",
  autoclose: true,
  todayHighlight: true
});

// Set end date to today's date
$("#end").val(new Date().toISOString());

$('#myActivityModal').on('shown.bs.modal', function (e) {
  // do something...
  getMyActivity('today');
});

//#endregion

//#region Genesys Cloud Functions

/**
 * Starts the entire process
 * */
async function start() {
  try {
    // Init
    showStatus('Initializing...');
    $("#search").attr('disabled', true);
    $("#spinner").attr('hidden', false);

    // Date check
    if ($("#start").val() === '' || $("#end").val() === '') {
      alert("Please set the start and end dates first");
      return;
    }

    // Clear conversations
    $("#conversationsTable").empty();

    // Get list of conversations with consult transfers to external parties
    showStatus('Getting Conversations with a completed external consult transfer...');
    await getAnalyticsConversations();

    showStatus('Filtering Conversations...');
    await filterConversations($("#transferPhoneNumber").val());

    // Get recordings ids
    showStatus('Getting Recordings...');
    await getRecordingIds();

    // Populate table with all the info
    await populateTable();
  } catch (err) {
    console.error(err);
  } finally {
    showStatus('');
    $("#search").attr('disabled', false);
    $("#spinner").attr('hidden', true);
  }
}

/**
 * Starts the entire process
 * @param phoneNumber (optional) Specific phone number to search for
 * */
function getAnalyticsConversations() {
  return new Promise(async (resolve, reject) => {

    // Clear all existing conversations
    results.conversations = [];

    let startDate = new Date($("#start").val());
    let endDate = startDate.addDays(30); // Max interval range supported by Genesys Cloud Analytics queries

    // Loop through date intervals and pages
    while (true) {
      let pageNumber = 0;
      while (true) {
        pageNumber++;
        try {
          let body = {
            "interval": `${startDate.toISOString()}/${endDate.toISOString()}`,
            "order": "asc",
            "orderBy": "conversationStart",
            "paging": {
              "pageSize": 100,
              "pageNumber": pageNumber
            },
            "segmentFilters": [
              {
                "type": "and",
                "predicates": [
                  {
                    "type": "dimension",
                    "dimension": "direction",
                    "operator": "matches",
                    "value": "outbound"
                  },
                  {
                    "type": "dimension",
                    "dimension": "segmentType",
                    "operator": "matches",
                    "value": "interact"
                  }
                ]
              },
            ],
            "conversationFilters": [
              {
                "type": "and",
                "predicates": [
                  {
                    "type": "metric",
                    "metric": "nConsultTransferred",
                    "range": {
                      "gte": 1
                    }
                  }
                ]
              }
            ]
          };

          console.log('Running analytics query:', body);
          console.debug('Page Number:', pageNumber);
          console.debug('Start Date:', startDate);
          console.debug('End Date:', endDate);

          let data = await callAPI('POST', 'analytics/conversations/details/query', body);
          if (Object.keys(data).length > 0) {
            console.debug('Got conversations:', data);
            results.conversations.push(...data.conversations);
          } else {
            break; // No results for current page. Exiting to jump to the next date interval.
          }

        } catch (error) {
          console.error(error);
          return reject(error);
        }
      }
      startDate = endDate;
      endDate = startDate.addDays(30);

      if (startDate > new Date()) {
        console.debug('No more dates');
        break; // We are past today's date so no reason to continue.
      }
    }
    console.log('Got conversations:', results.conversations);
    return resolve();
  });
}

/**
 * 
 * - Get last participant from conversation
 *   - Is purpose = "customer"?
 * - Get last session
 *   - Is dnis !== sessionDnis?
 * - Get last segment
 *   - Is segmentType = "interact"?
 * 
 * If so, conversation qualifies. If not, conversation will not be shown.
 */
function filterConversations(phoneNumber) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!results.conversations) {
        alert('No conversations found');
        return reject('No conversations found');
      }

      let filteredConversations = [];
      for await (const conversation of results.conversations) {
        // Get last participant
        let lastParticipant = conversation.participants[conversation.participants.length - 1];
        console.log('Last Participant:', lastParticipant);

        // Only keep conversations which last participant's purpose is "customer"
        if (lastParticipant.purpose !== 'customer') {
          continue; // Next!
        }

        // Get last session
        let lastSession = lastParticipant.sessions[lastParticipant.sessions.length - 1];
        console.log('Last Session:', lastSession);

        // If dnis != sessionDnis, ignore this conversation
        // This means that the call was not transferred
        if (lastSession.dnis === lastSession.sessionDnis) {
          continue; // Next!
        }

        // If phoneNumber is set, do not show calls that were not transferred to that phone number
        if (phoneNumber && phoneNumber !== lastSession.sessionDnis) {
          continue; //Next
        }

        // Get last segment
        let lastSegment = lastSession.segments[lastSession.segments.length - 1];
        console.log('Last Segment:', lastSegment);

        // If the last segment is not "interact", the ignore the conversation
        if (lastSegment.segmentType !== 'interact') {
          continue; // Next!
        }

        console.log('Conversation is a match:', conversation.conversationId);
        filteredConversations.push(conversation);
      }
      results.conversations = filteredConversations;
      console.log('After Filtering Conversations:', results);
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

/**
 * Gets the recording ids for each conversation. The only way to do this is to request the recording download.
 * */
function getRecordingIds() {
  return new Promise(async (resolve, reject) => {
    try {
      if (!results.conversations) {
        alert('No conversations found');
        return reject('No conversations found');
      }
      for await (const conversation of results.conversations) {
        try {
          let data = await callAPI('GET', `conversations/${conversation.conversationId}/recordings?maxWaitMs=5000&formatId=WEBM`);
          console.debug('Got recording data:', data);
          conversation.recordings = data;
        } catch (error) {
          if (error.status === 404) {
            console.debug('No recordings found for: ', conversation.conversationTd);
            continue;
          }
        }
      }
      console.log('Results with recordings:', results);
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

/**
 * Populates the table using JQuery
 * */
async function populateTable() {
  if (!results?.conversations) {
    console.error('No results found');
    alert('No recordings found');
    return;
  }

  for await (const conversation of results.conversations) {
    if (conversation.recordings && conversation.recordings.length > 1) {
      let conversationRow = $("<tr/>").appendTo("#conversationsTable");

      // Start Time
      $("<td/>").text(conversation.conversationStart).appendTo(conversationRow);

      // Conversation - Id
      let conversationTd = $("<td/>").appendTo(conversationRow);
      let conversationDiv = $("<div/>").appendTo(conversationTd);
      $("<div/>").html(`<a href="https://apps.${environment}/directory/#/engage/admin/interactions/${conversation.conversationId}" target="_blank">${conversation.conversationId}</a>`).appendTo(conversationDiv);

      // Conversation - Division
      let conversationDivisionDiv = $("<div/>").appendTo(conversationDiv);
      for (let index = 0; index < conversation.divisionIds.length; index++) {
        const conversationDivisionId = conversation.divisionIds[index];

        // Cache division name to avoid calling the API every time
        let divisionName;
        let existingDivision = divisions.find(d => d.id === conversationDivisionId);
        if (existingDivision && existingDivision.length > 0) {
          divisionName = existingDivision.name;
        } else {
          let data = await callAPI('GET', `authorization/divisions/${conversationDivisionId}`);
          divisionName = data.name;
          divisions.push({
            id: conversationDivisionId,
            name: data.name
          });
        }
        $("<small/>").text(`Division: ${divisionName}`).appendTo(conversationDivisionDiv);
      }

      // Conversation - External Phone Number
      let conversationExternalPhoneNumberDiv = $("<div/>").appendTo(conversationDiv);
      for (let index = 0; index < conversation.participants.length; index++) {
        const conversationParticipant = conversation.participants[index];
        if ((conversationParticipant.purpose === 'customer' || conversationParticipant.purpose === 'external') && conversationParticipant.externalContactId) {
          let externalPhoneNumber = conversationParticipant.sessions.find(s => s.mediaType === 'voice').ani;
          $("<small/>").text(`External Caller's Phone Number: ${externalPhoneNumber}`).appendTo(conversationExternalPhoneNumberDiv);
          $("<br/>").appendTo(conversationExternalPhoneNumberDiv);
        }
      }

      // Recordings
      let recordingsTd = $("<td />", {}).appendTo(conversationRow);
      let lastRecording;
      for await (const recording of conversation.recordings) {
        let recordingDiv = $("<div/>").appendTo(recordingsTd);
        $("<div/>").text(recording.id).appendTo(recordingDiv);
        let recordingStartTimeDiv = $("<div/>").appendTo(recordingDiv);
        $("<small/>").text(`Start Time: ${recording.startTime}`).appendTo(recordingStartTimeDiv);

        lastRecording = {
          conversationId: conversation.conversationId,
          recordingId: recording.id,
          fileState: recording.fileState
        };
      }

      // Last Recording
      let lastRecordingTd = $("<td />", {}).appendTo(conversationRow);

      let lastRecordingDiv = $("<div/>").appendTo(lastRecordingTd);
      let buttonClass = lastRecording.fileState !== "AVAILABLE" ? "btn-success" : "btn-danger";
      let buttonText = lastRecording.fileState !== "AVAILABLE" ? `Status: ${lastRecording.fileState}` : "Delete Last Recording";
      let buttonDisabled = lastRecording.fileState !== "AVAILABLE";
      $("<button/>", { class: `btn ml-3 ${buttonClass}`, disabled: buttonDisabled }).text(buttonText).on('click', (e) => deleteRecording(lastRecording.conversationId, lastRecording.recordingId)).appendTo(lastRecordingDiv);

      let lastRecordingRecordingId = $("<div/>").appendTo(lastRecordingDiv);
      $("<small/>", {}).text(` (${lastRecording.recordingId})`).appendTo(lastRecordingRecordingId);

    }
  }

}

/**
 * Deletes a recording by setting its deleteDate to a date before today (yesterday by default)
 * Recording will not show as deleted right away. This can take a few minutes.
 * */
function deleteRecording(conversationId, recordingId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Set deleteDate to yesterday
      let body = {
        fileState: "DELETED",
        deleteDate: new Date().addDays(-1).toISOString()
      };

      console.debug('Setting recording deleteDate to:', body.deleteDate);
      let data = await callAPI('PUT', `conversations/${conversationId}/recordings/${recordingId}`, body);
      console.log('Recording marked for deletion');
      $('.toast').toast('show');
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

/**
 * Logs the user out of the session with this app only
 * */
async function logout() {
  await callAPI('DELETE', 'tokens/me');
  localStorage.clear('access_token');
  localStorage.clear('environment');
  window.location.href = 'index.html';
}

//#endregion

//#region My Activity

function getMyActivity(period) {
  $('#auditResults').empty();

  let startDate, endDate;
  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date();
      break;
    case 'yesterday':
      startDate = new Date();
      startDate = startDate.addDays(-1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date();
      endDate = endDate.addDays(-1);
      endDate.setUTCHours(23, 59, 59, 999);
      break;
    default:
      break;
  }
  let interval = `${startDate.toISOString()}/${endDate.toISOString()}`;
  console.log('Interval:', interval);

  return new Promise(async (resolve, reject) => {
    try {
      let body = {
        "interval": interval,
        "serviceName": "Quality",
        "filters": [
          {
            "property": "UserId",
            "value": "6c8e15bd-7689-417f-adfa-00ab71920bde"
          },
          {
            "property": "EntityType",
            "value": "Recording"
          },
          {
            "property": "Action",
            "value": "UpdateRetention"
          }
        ]
      };
      let auditQueryResults = await callAPI('POST', 'audits/query', body);
      console.log('Audit Query Results:', auditQueryResults);

      while (true) {
        let auditResults = await callAPI('GET', `audits/query/${auditQueryResults.id}/results?pageSize=100`);
        console.log('Audit Results:', auditResults);
        for await (const result of auditResults.entities) {
          let row = $('<tr/>').appendTo('#auditResults');
          $('<th/>', { scope: 'row' }).text(result.eventDate).appendTo(row);
          $('<td/>').text(result.action).appendTo(row);
          $('<td/>').text(result.entityType).appendTo(row);
          $('<td/>').text(result.entity.id).appendTo(row);
          $('<td/>').text(result.context.conversationId).appendTo(row);
        }
        break;
      }
      return resolve(auditQueryResults);
    } catch (error) {
      console.error(error);
      return reject(error);
    }
  });
}

//#endregion

//#region Misc Functions

function showStatus(message) {
  $("#message").text(message);
}

function callAPI(method, apiPath, body) {
  console.debug('Calling:', apiPath);

  return new Promise(async (resolve, reject) => {
    try {
      await axios({
        url: `https://api.${environment}/api/v2/${apiPath}`,
        method: method,
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: body,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Errors handled by axios interceptor (check below in this file)
        }
      })
        .then((response) => {
          if (response.status === 202) {
            // Need to wait until ready (200). Handled by axios interceptors.
          }
          console.debug('Axios request succeeded:', response);
          return resolve(response.data);
        })
        .catch((error) => {
          return reject(error);
        })
        .finally(() => {
          console.debug('Axios request complete.');
        });
    } catch (error) {
      console.error(error);
      return reject(error);
    } finally {
      console.debug('Request complete.');
    }
  });
}

axios.interceptors.response.use(async (response) => {
  console.debug('Response:', response);
  switch (response.status) {
    case 202:
      if (response.config.url.indexOf('audits') !== -1) {
        return response; // Audits take a while to return results. Just ignore this here.
      } else {
        console.log('Recording is not ready yet. Retrying...:', response.config);
        await sleep(5000);
        return axios.request(response.config);
      }
    case 400:
      if (response.config.url.indexOf('audits') !== -1) {
        console.log('Audits query is not ready yet. Waiting for 5 seconds and retrying...:', response.config);
        await sleep(5000);
        return axios.request(response.config);
      } else {
        return response;
      }
    case 429:
      console.log('Too many requests. Waiting for 1 minute and trying again...');
      await sleep(60000);
      return axios.request(response.config);
    default:
      break;
  }
  return response;
}, (error) => {
  console.error('in interceptor error');
  return Promise.reject(error);
});

function sleep(ms) {
  console.log(`Waiting ${ms} ms...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Prototype function add days to a date
Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};;

    //#endregion

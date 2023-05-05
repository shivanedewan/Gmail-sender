require('dotenv').config()
const nodemailer = require('nodemailer');
const { google } = require('googleapis');


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Get unread messages
async function getUnreadMessages() {
  try {
    const res = await gmail.users.messages.list({
      userId: 'shivanedewan@gmail.com',
      q: 'is:unread'
    });
    return res.data.messages;
  } catch (err) {
    console.log('The API returned an error: ' + err);
  }
}

// Send email
async function sendEmail(from) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'shivanedewan@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: 'shivanedewan@gmail.com',
      to: from,
      subject: 'Hello from gmail using API',
      text: 'Hello from gmail email using API',
      html: '<h1>Hello from gmail email using API</h1>',
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.log(error.message);
  }
}

// Modify labels or create new label
async function modifyLabels(messageId) {
    try {
        // new_label is the label name which we want to add mails to
        const labelName="new_label"  
        const labelList=await gmail.users.labels.list({
            userId:"shivanedewan@gmail.com"
        });
        const labels=labelList.data.labels
        let labelId=""
        for(const label of labels){
            if(label.name==labelName){
                labelId=label.id;
                break;
            }
        }
        // if there is no label named new_label then create one
        if(!labelId){
            const res=await gmail.users.labels.create({
                userId:"shivanedewan@gmail.com",
                requestBody:{
                    name: labelName,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show'
                }
            })
            labelId=res.data.id;
        }

        //  moving to new_label
      await gmail.users.messages.modify({
        userId: 'shivanedewan@gmail.com',
        id: messageId,
        resource: {
          addLabelIds: [labelId],
          removeLabelIds:['UNREAD']
        },
      });
    } catch (err) {
      console.log('The API returned an error: ' + err);
    }
  }
  
async function hasThreadReplied(threadId){
    const threadRes=await gmail.users.threads.get({
        userId:'shivanedewan@gmail.com',
        id:threadId,
        format:'full',
        metadataHeaders:['References']
    });
    const threadLabels=threadRes.data.messages[0].labelIds
    console.log(threadLabels)
    if(threadLabels.includes('UNREAD')){
        console.log("thread not replied")
        return false
    }
    else{
        console.log("thread replied")
        return true
    }
    
}

// Main function to process unread messages
async function processUnreadMessages() {
    const messages = await getUnreadMessages();
    if (messages) {
      for (const message of messages) {
       if (await hasThreadReplied(message.threadId)===false){
        
        const res = await gmail.users.messages.get({
          userId: 'shivanedewan@gmail.com',
          id: message.id,
          format: 'full',
          metadataHeaders: ['From']
        });
        const headers = res.data.payload.headers;
        let from = "";
        headers.forEach((header) => {
          if (header.name === 'From') {
            from = header.value;
            console.log(from)
          }
        });
        await sendEmail(from);
        console.log(message.id)
        // also modifies message from read to unread
        await modifyLabels(message.id);
         }
      
  }
    } else {
      console.log('No unread messages.');
    }
  }



processUnreadMessages()
const intervalTime=Math.floor(Math.random()*(120-45+1)+45);
setInterval(async()=>{
    console.log("checking unread mails",await processUnreadMessages())
}, intervalTime*1000);
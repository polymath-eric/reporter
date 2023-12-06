const axios = require("axios");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const EMAIL_USER = "";
const EMAIL_PASSWORD = "";
const RECEIVER_EMAIL = "";
const BCC_EMAIL = ""; // so I can monitor

const GRAPHQL_HOST = "http://localhost:3045/";
const OUT_CREATED_FILE = path.join("/tmp", "created.csv");
const OUT_REGISTERED_FILE = path.join("/tmp", "registered.csv");

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  let mm = date.getMonth() + 1; // month is zero-based
  let dd = date.getDate();

  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;

  return `${yyyy}/${mm}/${dd}`;
};

const createdQuery = {
  query: `query {
        events(
            orderBy: CREATED_AT_ASC
            filter: {
                moduleId: { equalTo: asset }
                eventId: { equalTo: AssetCreated }
            }
        ) {
            totalCount
            nodes {
                eventId
                moduleId
                blockId
                block {
                    datetime
                }
                creatorDid: eventArg0
                ticker: eventArg1
                isDivisible: eventArg2
                assetType: eventArg3
            }
        }
    }`,
};

const main = async () => {
  await axios
    .post(GRAPHQL_HOST, createdQuery, {
      headers: {
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Accept: "application/json",
        Connection: "keep-alive",
      },
    })
    .then((response) => {
      const events = response.data.data.events.nodes;
      const csvLines = events.map((event) => {
        const blockTime = event.block.datetime;
        const blockDay = formatDate(new Date(blockTime));
        return `${event.blockId},${blockTime},${blockDay},${event.creatorDid},${event.ticker},${event.isDivisible},${event.assetType}`;
      });
      const csvContent =
        "blockId,blockTime,blockDate,creatorDid,ticker,isDivisible,assetType\n" +
        csvLines.join("\n");
      fs.writeFileSync(OUT_CREATED_FILE, csvContent);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  const registeredQuery = {
    query: `query {
          events(
              orderBy: CREATED_AT_ASC
              filter: {
                  moduleId: { equalTo: asset }
                  eventId: { equalTo: TickerRegistered }
              }
          ) {
              totalCount
              nodes {
                  eventId
                  moduleId
                  blockId
                  block {
                      datetime
                  }
                  creatorDid: eventArg0
                  ticker: eventArg1
                  expiry: eventArg2
              }
          }
      }`,
  };

  await axios
    .post(GRAPHQL_HOST, registeredQuery, {
      headers: {
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Accept: "application/json",
        Connection: "keep-alive",
      },
    })
    .then((response) => {
      const events = response.data.data.events.nodes;
      const csvLines = events.map((event) => {
        const expiry = new Date(Number(event.expiry));

        const formatted = formatDate(expiry);
        const blockTime = event.block.datetime;
        const blockDate = formatDate(new Date(blockTime));

        return `${event.blockId},${blockTime},${blockDate},${event.creatorDid},${event.ticker},${formatted}`;
      });
      const csvContent =
        "blockId,blockTime,blockDate,creatorDid,ticker,expiry\n" +
        csvLines.join("\n");
      fs.writeFileSync(OUT_REGISTERED_FILE, csvContent);
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  // Configure your SMTP settings
  const transporter = nodemailer.createTransport({
    service: "gmail", // e.g., 'gmail'
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  const createdFileContent = fs.readFileSync(OUT_CREATED_FILE);
  const registeredFileContent = fs.readFileSync(OUT_REGISTERED_FILE);

  // Set up email options
  const mailOptions = {
    from: EMAIL_USER,
    to: RECEIVER_EMAIL,
    bcc: BCC_EMAIL,
    subject: "Sending CSV file",
    text: "Attached is the created and registered asset report",
    attachments: [
      {
        filename: "created.csv",
        content: createdFileContent,
      },
      {
        filename: "registered.csv",
        content: registeredFileContent,
      },
    ],
  };

  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

main()
  .then(() => {
    console.log(`Success at: ${new Date()}`);
  })
  .catch((err) => {
    console.error("error happened", err);
  });

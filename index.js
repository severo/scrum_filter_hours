const dotenv = require("dotenv");
dotenv.config();

const d3Dsv = require("d3-dsv");
const fetch = require("node-fetch");
const https = require("https");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

function formatCsv(rows) {
  const delimiter = process.env.OUTPUT_DELIMITER || "|";
  const columns = (process.env.OUTPUT_COLUMNS || "date,hours").split(",");
  const string = d3Dsv.dsvFormat(delimiter).format(rows, columns);
  return string;
}

async function updateGist({ gist, filename, content }) {
  return octokit.gists.update({
    gist_id: gist,
    files: {
      [filename]: { content },
    },
  });
}

const fetchOptions = {
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
};
const authenticatedFetch = (d) => fetch(d, fetchOptions).then((d) => d.text());
const parse = (d) =>
  d3Dsv.dsvFormat(process.env.INPUT_DELIMITER || "|").parse(d);

const main = async () => {
  const hours = parse(
    await authenticatedFetch(
      process.env.PREVIOUS_YEARS_URL ||
        "https://raw.githubusercontent.com/severo/personal-database/master/hours/hours_previous_years.csv"
    )
  ).concat(
    parse(
      await authenticatedFetch(
        process.env.CURRENT_YEAR_URL ||
          "https://raw.githubusercontent.com/severo/personal-database/master/hours/hours_current_year.csv"
      )
    )
  );

  const activities = parse(
    await authenticatedFetch(
      process.env.ACTIVITY_GISTS_URL ||
        "https://raw.githubusercontent.com/severo/personal-database/master/hours/activity_gists.csv"
    )
  );

  for (const { activity, gist, filename } of activities) {
    const filteredHours = hours.filter((d) => d.activity === activity);
    const csv = formatCsv(filteredHours);
    try {
      const test = await updateGist({ gist, filename, content: csv });
      if (test.status === 200) {
        console.log(`success - gist ${gist} updated for activity ${activity}`);
      } else {
        console.error(`error updating gist ${gist} for activity ${activity}`);
      }
    } catch (e) {
      console.error(e);
    }
  }
};

main();

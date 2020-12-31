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
const authenticatedFetch = (d) =>
  fetch(d, fetchOptions).then((res) => {
    if (res.ok) {
      // res.status >= 200 && res.status < 300
      return res.text();
    } else {
      throw new Error(res.statusText);
    }
  });
const parse = (d) =>
  d3Dsv.dsvFormat(process.env.INPUT_DELIMITER || "|").parse(d);

const main = async () => {
  const hours = [];
  const activities = [];
  try {
    hours.push(
      ...parse(
        await authenticatedFetch(
          process.env.PREVIOUS_YEARS_URL ||
            "https://raw.githubusercontent.com/severo/personal-database/master/hours/hours_previous_years.csv"
        )
      )
    );
  } catch (e) {
    console.error("Could not fetch hours for previous years");
    return;
  }
  try {
    hours.push(
      ...parse(
        await authenticatedFetch(
          process.env.CURRENT_YEAR_URL ||
            "https://raw.githubusercontent.com/severo/personal-database/master/hours/hours_current_year.csv"
        )
      )
    );
  } catch (e) {
    console.error("Could not fetch hours for current year");
    return;
  }
  try {
    activities.push(
      ...parse(
        await authenticatedFetch(
          process.env.ACTIVITY_GISTS_URL ||
            "https://raw.githubusercontent.com/severo/personal-database/master/hours/activity_gists.csv"
        )
      )
    );
  } catch (e) {
    console.error("Could not fetch activity gists");
    return;
  }

  for (const { activity, gist, filename } of activities) {
    const filteredHours = hours.filter((d) => d.activity === activity);
    const csv = formatCsv(filteredHours);
    try {
      const test = await updateGist({ gist, filename, content: csv });
      if (test.status === 200) {
        console.log(`success - gist ${gist} updated for activity ${activity}`);
      } else {
        console.warn(`error updating gist ${gist} for activity ${activity}`);
      }
    } catch (e) {
      console.warn(e);
    }
  }
};

main().catch((e) => {
  process.exitCode = 1;
});

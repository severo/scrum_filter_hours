const request = require('request')
const dotenv = require('dotenv')
const d3Dsv = require('d3-dsv')
const rp = require('request-promise-native')
const fs = require('fs').promises

function parseCsv(body) {
  const delimiter = process.env.DELIMITER || '|'
  const csv = ['date|hours|subcategory|details']
    .concat(body.split('\n').filter(e => e.substr(0, 3) === '201'))
    .reduce((csv, row) => csv.concat(row).concat('\n'), '')
  const rows = d3Dsv.dsvFormat(delimiter).parse(csv)
  return rows
}

function filterCategories(rows) {
  const categories = process.env.CATEGORIES
    ? process.env.CATEGORIES.split(',')
    : []
  const subcategories = process.env.SUBCATEGORIES
    ? process.env.SUBCATEGORIES.split(',')
    : []

  return rows.filter(row => {
    return (
      subcategories.includes(row.subcategory) ||
      categories.includes(row.subcategory.slice(0, 2))
    )
  })
}

function formatCsv(rows) {
  const delimiter = process.env.DELIMITER || '|'
  const columns = (process.env.OUTPUT_COLUMNS || 'date,hours').split(',')
  const string = d3Dsv.dsvFormat(delimiter).formatBody(rows, columns)
  return string
}

async function saveCsv(string) {
  const outputFile = process.env.OUTPUT_FILE || '/tmp/output.csv'
  try {
    await fs.writeFile(outputFile, string)
  } catch {
    console.log(`Couldn't write file ${scrumUrl}`)
    process.exit(1)
  }
  console.log(`Filtered rows saved to ${outputFile}`)
}

dotenv.config()
const scrumUrl = process.env.SCRUM_URL
rp.get(scrumUrl)
  .catch(err => {
    console.log(`Couldn't download and process ${scrumUrl}`)
    process.exit(1)
  })
  .then(parseCsv)
  .then(filterCategories)
  .then(formatCsv)
  .then(saveCsv)
  .then(() => process.exit(0))

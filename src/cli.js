#!/usr/bin/env node

const fs = require('fs');
const Wappalyzer = require('./driver');

const args = process.argv.slice(2);
const options = {};

let arg

const aliases = {
  a: 'userAgent',
  b: 'batchSize',
  d: 'debug',
  t: 'delay',
  h: 'help',
  H: 'header',
  D: 'maxDepth',
  m: 'maxUrls',
  p: 'probe',
  P: 'pretty',
  r: 'recursive',
  w: 'maxWait',
  n: 'noScripts',
  N: 'noRedirect',
  e: 'extended',
  f: 'file', // Alias for input list file
}

while (true) {
  arg = args.shift();

  if (!arg) {
    break;
  }

  const matches = /^-?-([^=]+)(?:=(.+)?)?/.exec(arg);

  if (matches) {
    const key =
      aliases[matches[1]] ||
      matches[1].replace(/-\w/g, (_matches) => _matches[1].toUpperCase());
    const value = matches[2]
      ? matches[2]
      : args[0] && !args[0].startsWith('-')
      ? args.shift()
      : true;

    if (options[key]) {
      if (!Array.isArray(options[key])) {
        options[key] = [options[key]];
      }

      options[key].push(value);
    } else {
      options[key] = value;
    }
  }
}

const urls = [];



if (options.file) {
  const file = options.file;
  if (!fs.existsSync(file)) {
    console.error(`File "${file}" does not exist.`);
    process.exit(1);
  }
  require('fs').readFileSync(file, 'utf-8').split(/\r?\n/).forEach(function(line){ // Apparently reading a file in node.js is hard. Look at this abomination KEKW
    if (line.trim() !== ''){
      urls.push(line);
    }
    // console.log(line);
  })

} else {
  console.error('No input list file specified.');
  console.log("");
  process.stdout.write(`Usage:
  wappalyzer -f inputlist.txt [options]

Examples:
  wappalyzer -f inputlist.txt
  node cli.js -f inputlist.txt -r -D 3 -m 50 -H "Cookie: username=admin"
  docker wappalyzer/cli -f inputlist.txt --pretty

Options:
  -b, --batch-size=...       Process links in batches
  -d, --debug                Output debug messages
  -t, --delay=ms             Wait for ms milliseconds between requests
  -h, --help                 This text
  -H, --header               Extra header to send with requests
  --html-max-cols=...        Limit the number of HTML characters per line processed
  --html-max-rows=...        Limit the number of HTML lines processed
  -D, --max-depth=...        Don't analyse pages more than num levels deep
  -m, --max-urls=...         Exit when num URLs have been analysed
  -w, --max-wait=...         Wait no more than ms milliseconds for page resources to load
  -p, --probe=[basic|full]   Perform a deeper scan by performing additional requests and inspecting DNS records
  -P, --pretty               Pretty-print JSON output
  --proxy=...                Proxy URL, e.g. 'http://user:pass@proxy:8080'
  -r, --recursive            Follow links on pages (crawler)
  -a, --user-agent=...       Set the user agent string
  -n, --no-scripts           Disabled JavaScript on web pages
  -N, --no-redirect          Disable cross-domain redirects
  -e, --extended             Output additional information
  --local-storage=...        JSON object to use as local storage
  --session-storage=...      JSON object to use as session storage
  --defer=ms                 Defer scan for ms milliseconds after page load
`)
  process.exit(1);
}
async function runWappalyzer() {
  if (urls.length === 0) {
    console.error('Input list is empty.');
    process.exit(1);
  }

  try {
    const wappalyzer = new Wappalyzer(options);
    await wappalyzer.init();
    const printables = {}

    for (const url of urls) {
      // console.log(`[URL]:${url}, is being checked :)`)
      const site = await wappalyzer.open(url);

      await new Promise((resolve) =>
      setTimeout(resolve, parseInt(options.defer || 0, 10)))

      // const results = await site.analyze();
      const analysisResult = await site.analyze();
      printables[url] = analysisResult;

      // process.stdout.write(
      //   `${JSON.stringify(results, null, options.pretty ? 2 : null)}\n`
      // );
    }
    process.stdout.write(
      `${JSON.stringify(printables, null, options.pretty ? 2 : null)}\n`
    );

    await wappalyzer.destroy();

    process.exit(0);
  } catch (error) {
    console.error(error.message || String(error))
  }
}

runWappalyzer();

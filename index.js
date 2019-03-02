#!/usr/bin/env nodejs

// force timezone
process.env.TZ = 'America/New_York'

const fs = require('fs')
const path = require('path')
const CalendarAPI = require('node-google-calendar')
const twig = require('twig')
const http = require('http')
const routes = require('patterns')()
const st = require('st')
const moment = require('moment-timezone')
const safeString = require('url-safe-string')
const config = require('./lib/calConfig')

const calAPI = new CalendarAPI(config)
const times = timeRange()
const now = new Date()

const whereIs = whereIsEveryone()

// fetch and return JSON
routes.add('GET /update', (req, res) => {
  console.log('Updating...')
  whereIs(data => {
    const stringify = JSON.stringify(data)
    // store results in static file
    fs.writeFile('./static/events.json', stringify, 'utf8', () => {
      console.log('Results saved!')
    })

    // return data in JSON
    res.setHeader('Content-Type', 'application/json')
    res.end(stringify)
  })
})

// render Twig using cached events if available
routes.add('GET /', (req, res) => {
  let people = []

  // delete require cache and refetch
  delete require.cache[path.resolve('./static/events.json')]

  try {
    people = require('./static/events.json')
  } catch (err) {
    people = []
  }

  twig.renderFile('./templates/index.twig', { people }, (err, html) => {
    res.setHeader('Content-Type', 'text/html')
    res.end(html)
  })
})

// serve static files in current working directory
const staticDir = st({
  path: `${__dirname}/static`,
  url: '/',
  index: 'index.html'
})

// create server
const server = http.createServer((req, res) => {
  // match routes
  const match = routes.match(`${req.method} ${req.url}`)

  // route handler found so run
  if (match) {
    const fn = match.value
    req.params = match.params
    fn(req, res)

    // otherwise static file
  } else {
    staticDir(req, res)
  }
})

// listen for http request on port 9000
server.listen(9000, () => {
  console.log('🤘 Server is running on http://localhost:9000 🤘')
})

// recursive function to loop through calendars
// and pull list of todays events
function whereIsEveryone() {
  let curr = 0
  let people = []

  return function whereIs(cb) {
    let cal = config.calendarIds[curr]

    // if we've cycled through everyone
    // then call callback and reset vars
    if (!cal || !cal.name) {
      cb(people)
      curr = 0
      people = []
      return
    }

    console.log(`Fetching events for ${cal.name}`)

    // add new person to array
    people.push({
      name: cal.name,
      handle: new safeString().generate(cal.name),
      events: []
    })

    const currentPerson = people[people.length - 1]

    // fetch all events for today (midnight to midnight)
    calAPI.Events.list(cal.calendar, {
      timeMin: times.min,
      timeMax: times.max,
      singleEvents: true,
      orderBy: 'startTime'
    })
      // loop through events and test to see if happening now
      .then(json => {
        if (json.length) {
          json.forEach(event => {
            const currentEvent = findCurrentEvent(event)

            if (currentEvent) {
              currentPerson.events.push(currentEvent)
            }
          })
        }

        curr++
        whereIs(cb)
      })
      // calendar has not been shared correctly
      .catch(err => {
        curr++
        currentPerson.events.push({
          title: 'Invalid permissions',
          location: '❌'
        })
        whereIs(cb)
      })
  }
}

// find event happening right now, return event object or false
function findCurrentEvent(event) {
  if (event.summary && event.start && event.end) {
    let times

    // build date objects for event start / end times
    // regular events use dateTime, all day use date
    if (event.start.dateTime) {
      times = {
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        allDay: false
      }
    } else if (event.start.date) {
      times = {
        start: new Date(event.start.date),
        end: new Date(event.end.date),
        allDay: true
      }
    } else {
      return false
    }

    // check to see if event is happening now
    if (
      now.getTime() > times.start.getTime() &&
      now.getTime() < times.end.getTime()
    ) {
      return {
        id: event.id,
        title: event.summary,
        location: event.location || 'Unkown',
        description: event.description || '',
        times: {
          start: moment(times.start).format('h:mma'),
          end: moment(times.end).format('h:mma'),
          allDay: times.allDay
        }
      }
    } else {
      return false
    }
  }
}

// todays timerange (midnight to midnight)
function timeRange() {
  let date = new Date(),
    year = date.getFullYear(),
    month = date.getMonth() + 1,
    day = date.getDate()

  if (month < 10) {
    month = `0${month}`
  }

  if (day < 10) {
    day = `0${day}`
  }

  return {
    min: moment
      .tz(`${year}-${month}-${day}T00:00:00`, 'America/New_York')
      .format(),
    max: moment
      .tz(`${year}-${month}-${day}T23:59:59`, 'America/New_York')
      .format()
  }
}

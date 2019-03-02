const ui = {
  list: document.querySelector('[data-list]'),
  update: document.querySelector('[data-update]'),
  time: document.querySelector('[data-time]')
}

bindEvents()
fetchEvents()
updateTime()

function updateTime() {
  const today = new Date()
  let h = today.getHours()
  let m = today.getMinutes()
  let ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  h = h ? h : 12

  if (m < 10) {
    m = `0${m}`
  }

  ui.time.innerHTML = `${h}:${m}${ampm}`

  setTimeout(updateTime, 30000)
}

function fetchEvents() {
  ui.update.style.display = 'flex'

  fetch('/update')
    .then(response => {
      return response.json()
    })
    .then(json => {
      generateMarkup(json)
      setTimeout(fetchEvents, 30000)
    })
}

function generateMarkup(people) {
  let template = ''

  people.forEach(person => {
    template += `
      <li class="grid__item person">
        <h2 class="person__name">${person.name}</h2>
    `

    if (person.events.length) {
      template += '<ul class="events">'

      person.events.forEach(event => {
        let times = ''

        if (event.times && event.times.allDay) {
          times = '<p class="person__times">All day</p>'
        } else if (event.times) {
          times = `<p class="person__times">${event.times.start} - ${
            event.times.end
          }</p>`
        }

        template += `
          <li class="events__item">
            <p class="person__meeting">${event.title}</p>
            <p class="person__location">${event.location}</p>
            ${times}
        `

        if (event.description) {
          template += `
            <a 
            class="person__description"
            href="#" 
            data-description-trigger="${person.handle}-${event.id}">
            <svg class="person__info" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
              <g class="nc-icon-wrapper" fill="#0d47a1">
                <path fill="#0d47a1" d="M8,0C3.6,0,0,3.6,0,8s3.6,8,8,8s8-3.6,8-8S12.4,0,8,0z M8,14c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6 S11.3,14,8,14z"/> 
                <rect data-color="color-2" x="7" y="7" width="2" height="5"/>
                <circle data-color="color-2" cx="8" cy="5" r="1"/>
              </g>
            </svg>
            View description
          </a>
          `
        }

        template += '</li>'
      })

      template += '</ul><div class="event-descriptions">'

      person.events.forEach(event => {
        if (event.description) {
          template += `
            <div class="event-descriptions__desc" data-description="${
              person.handle
            }-${event.id}">
              <a 
                class="event-descriptions__close"
                data-description-close
                href="#">
                <img src="./close.svg" />
              </a>
              ${event.description}
            </div>
          `
        }
      })

      template += '</div>'
    }

    template += '</li>'
  })

  ui.list.innerHTML = template
  ui.update.style.display = 'none'

  bindEvents()
}

function bindEvents() {
  const triggers = document.querySelectorAll('[data-description-trigger]')
  const closes = document.querySelectorAll('[data-description-close]')

  triggers.forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault()

      const descs = document.querySelectorAll('[data-description]')

      descs.forEach(desc => {
        desc.classList.remove('is-active')
      })

      document
        .querySelector(
          `[data-description="${trigger.getAttribute(
            'data-description-trigger'
          )}"]`
        )
        .classList.add('is-active')
    })
  })

  closes.forEach(close => {
    close.addEventListener('click', e => {
      e.preventDefault()

      const descs = document.querySelectorAll('[data-description]')

      descs.forEach(desc => {
        desc.classList.remove('is-active')
      })
    })
  })
}

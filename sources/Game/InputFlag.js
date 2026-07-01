import countriesData from '../data/countries.js'
import { Events } from './Events.js'
import { Game } from './Game.js'

const DEFAULT_COUNTRY_CODE = 'ku'
const LEGACY_COUNTRY_CODE_MAP = new Map([[ 'us', DEFAULT_COUNTRY_CODE ]])

export class InputFlag
{
    constructor(element)
    {
        // Setup
        this.element = element
        this.buttonElement = this.element.querySelector('.js-flag-button')
        this.currentElement = this.buttonElement.querySelector('.js-flag')
        this.selectElement = this.element.querySelector('.js-flag-select')
        this.closeElement = this.element.querySelector('.js-flag-close')
        this.searchElement = this.element.querySelector('.js-flag-search')
        this.removeElement = this.element.querySelector('.js-flag-remove')
        this.noResultElement = this.element.querySelector('.js-no-result')
        this.scrollerElement = this.element.querySelector('.js-scroller')

        this.game = Game.getInstance()
        this.events = new Events()
        this.inDOM = false
        this.isOpen = false
        this.countries = new Map()
        this.country = null

        this.setCountries()
        this.setSearch()

        // DOM events
        this.removeElement.addEventListener('click', (event) =>
        {
            event.preventDefault()
            this.select(null)
        })

        this.buttonElement.addEventListener('click', (event) =>
        {
            event.preventDefault()
            this.open()
        })

        this.closeElement.addEventListener('click', (event) =>
        {
            event.preventDefault()
            this.close()
        })

        // Country code
        // Kurdistan is the game default. A previous US selection is migrated once, while
        // the complete country list remains available for multiplayer and server use.
        let countryCode = this.game.save.get('settings.countryCode', DEFAULT_COUNTRY_CODE) || DEFAULT_COUNTRY_CODE
        countryCode = LEGACY_COUNTRY_CODE_MAP.get(countryCode) ?? countryCode

        this.country = this.countries.get(countryCode) ?? this.countries.get(DEFAULT_COUNTRY_CODE)

        if(this.country)
        {
            this.currentElement.src = this.country.imageUrl
            this.buttonElement.classList.add('has-flag')
            this.game.save.set('settings.countryCode', this.country.code, { immediate: true })
        }
    }

    setCountries()
    {
        for(const _country of countriesData)
        {
            const imageUrl = `ui/flags/${_country[2]}.webp`
            const element = document.createElement('div')
            const image = document.createElement('img')
            const label = document.createElement('span')

            element.classList.add('choice')
            image.classList.add('js-flag', 'flag')
            image.src = imageUrl
            image.loading = 'lazy'
            image.alt = ''
            label.classList.add('label')
            label.textContent = `${_country[0]} (${_country[2]})`
            element.append(image, label)

            const country = {}
            country.element = element
            country.terms = `${_country[0]} ${_country[1]} ${_country[2]}`
            country.imageUrl = imageUrl
            country.code = _country[2]

            country.element.addEventListener('click', () =>
            {
                this.select(country)
            })

            this.countries.set(country.code, country)
        }
    }

    setSearch()
    {
        const searchFlag = (value) =>
        {
            const sanitizedValue = value.trim().toLowerCase()
            let found = false

            // Empty search => All countries
            if(sanitizedValue === '')
            {
                found = true
                this.countries.forEach((country) =>
                {
                    country.element.style.display = 'block'
                })
            }

            // Non-empty search => Plain-text matching avoids invalid RegExp input.
            else
            {
                this.countries.forEach((country) =>
                {
                    if(country.terms.toLowerCase().includes(sanitizedValue))
                    {
                        found = true
                        country.element.style.display = 'block'
                    }
                    else
                    {
                        country.element.style.display = 'none'
                    }
                })
            }

            // No result
            if(!found)
                this.noResultElement.classList.add('is-visible')
            else
                this.noResultElement.classList.remove('is-visible')
        }

        this.searchElement.addEventListener('input', () =>
        {
            searchFlag(this.searchElement.value)
        })
    }

    addToDOM()
    {
        this.countries.forEach(_country =>
        {
            this.scrollerElement.appendChild(_country.element)
        })
        
        this.inDOM = true
    }

    open()
    {
        // Already
        if(this.isOpen)
            return

        // Not yet in DOM > Add
        if(!this.inDOM)
            this.addToDOM()

        this.isOpen = true
        this.selectElement.classList.add('is-visible')
        this.searchElement.focus()

        if(this.country)
            this.scrollerElement.scrollTop = this.country.element.offsetTop - 15
    }

    close()
    {
        // Already
        if(!this.isOpen)
            return

        this.isOpen = false
        this.selectElement.classList.remove('is-visible')
    }

    select(country = null)
    {
        // Selected a flag
        if(country)
        {
            this.country = country
            this.currentElement.src = country.imageUrl
            this.buttonElement.classList.add('has-flag')
            this.game.save.set('settings.countryCode', country.code, { immediate: true })
        }

        // Selected no flag
        else
        {
            this.country = null
            this.buttonElement.classList.remove('has-flag')
            this.game.save.set('settings.countryCode', DEFAULT_COUNTRY_CODE, { immediate: true })
        }

        // Trigger event
        this.events.trigger('change', [ country ])

        this.close()
    }
}
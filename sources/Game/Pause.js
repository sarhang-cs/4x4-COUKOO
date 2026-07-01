import { Game } from './Game.js'
import { CircuitArea } from './World/Areas/CircuitArea.js'
import { Menu } from './Menu.js'
import { Modals } from './Modals.js'

export class Pause
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = document.querySelector('.js-pause')
        this.active = false
        this.previousFocus = null

        if(!this.element)
            return

        this.resumeElement = this.element.querySelector('.js-pause-resume')
        this.restartElement = this.element.querySelector('.js-pause-restart')
        this.mapElement = this.element.querySelector('.js-pause-map')
        this.optionsElement = this.element.querySelector('.js-pause-options')
        this.quitElement = this.element.querySelector('.js-pause-quit')

        this.setButtons()
        this.setInputs()
    }

    setButtons()
    {
        this.resumeElement.addEventListener('click', () => this.close())
        this.restartElement.addEventListener('click', () =>
        {
            this.game.reset()
            this.close()
        })
        this.mapElement.addEventListener('click', () =>
        {
            this.close()
            this.game.modals.open('map')
        })
        this.optionsElement.addEventListener('click', () =>
        {
            this.close()
            this.game.menu.open('options')
        })
        this.quitElement.addEventListener('click', () =>
        {
            this.close()
            this.game.menu.open('home')
        })
    }

    setInputs()
    {
        this.game.inputs.addActions([
            { name: 'pauseToggle', categories: [ 'wandering', 'racing', 'cinematic', 'pause' ], keys: [ 'Keyboard.KeyP', 'Gamepad.start' ] },
        ])

        this.game.inputs.events.on('pauseToggle', (action) =>
        {
            if(!action.active || this.game.tutorial?.active)
                return

            if(this.active)
            {
                this.close()
                return
            }

            if(this.game.menu.state !== Menu.CLOSED || this.game.modals.state !== Modals.CLOSED)
                return

            this.open()
        })
    }

    open()
    {
        if(this.active || this.game.tutorial?.active)
            return false

        this.active = true
        this.previousFocus = document.activeElement
        this.game.inputs.resetActiveActions()
        this.game.inputs.filters.clear()
        this.game.inputs.filters.add('pause')
        this.game.time.pause()
        this.game.audio.pause()

        this.element.hidden = false
        this.element.setAttribute('aria-hidden', 'false')
        requestAnimationFrame(() => this.element.classList.add('is-visible'))
        window.setTimeout(() => this.resumeElement.focus(), 40)
        return true
    }

    close()
    {
        if(!this.active)
            return

        this.active = false
        this.element.classList.remove('is-visible')
        this.element.setAttribute('aria-hidden', 'true')
        window.setTimeout(() => { this.element.hidden = true }, 220)
        this.game.time.resume()
        this.game.audio.resume()
        this.restoreInputMode()

        if(this.previousFocus?.focus)
            this.previousFocus.focus()
    }

    restoreInputMode()
    {
        this.game.inputs.filters.clear()
        const circuitState = this.game.world.areas?.circuit?.state
        const racing = circuitState === CircuitArea.STATE_RUNNING || circuitState === CircuitArea.STATE_STARTING || circuitState === CircuitArea.STATE_ENDING
        this.game.inputs.filters.add(racing ? 'racing' : 'wandering')
    }
}

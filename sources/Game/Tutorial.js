import { Game } from './Game.js'
import { Inputs } from './Inputs/Inputs.js'
import { CircuitArea } from './World/Areas/CircuitArea.js'

const STEPS = [
    {
        eyebrow: 'Step 1 of 4',
        title: 'Take control of the 4X4',
        copy: 'Steer gently first. The vehicle has weight, so braking early will help you keep control.',
        desktop: 'WASD or arrow keys to drive',
        touch: 'Drag the left control to drive',
        gamepad: 'Left stick to steer · RT to accelerate',
    },
    {
        eyebrow: 'Step 2 of 4',
        title: 'Use speed when you need it',
        copy: 'Boost is useful on open paths, but use it carefully near objects and sharp turns.',
        desktop: 'Hold Shift to boost · Ctrl or B to brake',
        touch: 'Use the on-screen driving controls',
        gamepad: 'Circle to boost · Square to brake',
    },
    {
        eyebrow: 'Step 3 of 4',
        title: 'Explore and interact',
        copy: 'Drive toward interactive points to discover activities, achievements, and hidden details.',
        desktop: 'Press Enter, E, or F to interact · M opens the map',
        touch: 'Tap the action controls when they appear',
        gamepad: 'Cross to interact · Select opens respawn',
    },
    {
        eyebrow: 'Step 4 of 4',
        title: 'You are ready to drive',
        copy: 'Open the quick menu any time for settings and controls. If you get stuck, use Respawn.',
        desktop: 'Press P to pause · Esc opens the quick menu · R respawns',
        touch: 'Use the top-right menu button and the Respawn option',
        gamepad: 'Start pauses · Select respawns',
    },
]

export class Tutorial
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = document.querySelector('.js-tutorial')
        this.active = false
        this.manual = false
        this.stepIndex = 0
        this.launchTimer = null
        this.previousFocus = null

        if(!this.element)
            return

        this.titleElement = this.element.querySelector('.js-tutorial-title')
        this.copyElement = this.element.querySelector('.js-tutorial-copy')
        this.eyebrowElement = this.element.querySelector('.js-tutorial-eyebrow')
        this.inputElement = this.element.querySelector('.js-tutorial-input')
        this.progressElement = this.element.querySelector('.js-tutorial-progress')
        this.nextElement = this.element.querySelector('.js-tutorial-next')
        this.skipElement = this.element.querySelector('.js-tutorial-skip')

        this.setButtons()
        this.setInputs()
        this.setMenuReplay()
        this.waitForWorld = this.waitForWorld.bind(this)
        this.game.ticker.events.on('tick', this.waitForWorld, 15)
    }

    waitForWorld()
    {
        if(this.game.reveal?.step < 2)
            return

        this.game.ticker.events.off('tick', this.waitForWorld)

        if(this.game.save.get('progress.tutorialCompleted', false))
            return

        this.launchTimer = window.setTimeout(() => this.open(), 550)
    }

    setButtons()
    {
        this.nextElement.addEventListener('click', () => this.next())
        this.skipElement.addEventListener('click', () => this.complete())
    }

    setInputs()
    {
        this.game.inputs.addActions([
            { name: 'tutorialNext', categories: [ 'tutorial' ], keys: [ 'Keyboard.Enter', 'Keyboard.Space', 'Gamepad.cross' ] },
            { name: 'tutorialSkip', categories: [ 'tutorial' ], keys: [ 'Keyboard.Escape', 'Gamepad.circle' ] },
        ])

        this.game.inputs.events.on('tutorialNext', (action) =>
        {
            if(this.active && action.active)
                this.next()
        })
        this.game.inputs.events.on('tutorialSkip', (action) =>
        {
            if(this.active && action.active)
                this.complete()
        })
        this.game.inputs.events.on('modeChange', () =>
        {
            if(this.active)
                this.render()
        })
    }

    setMenuReplay()
    {
        const replay = document.querySelector('.js-tutorial-open')
        if(!replay)
            return

        replay.addEventListener('click', () =>
        {
            if(this.game.menu?.state)
                this.game.menu.close()

            window.setTimeout(() => this.open({ manual: true }), 320)
        })
    }

    open({ manual = false } = {})
    {
        if(!this.element || this.active || this.game.pause?.active)
            return false

        this.manual = manual
        this.active = true
        this.stepIndex = 0
        this.previousFocus = document.activeElement
        this.game.inputs.resetActiveActions()
        this.game.inputs.filters.clear()
        this.game.inputs.filters.add('tutorial')

        this.element.hidden = false
        this.element.setAttribute('aria-hidden', 'false')
        requestAnimationFrame(() => this.element.classList.add('is-visible'))
        this.render()
        window.setTimeout(() => this.nextElement.focus(), 40)
        return true
    }

    next()
    {
        if(!this.active)
            return

        if(this.stepIndex >= STEPS.length - 1)
        {
            this.complete()
            return
        }

        this.stepIndex++
        this.render()
    }

    complete()
    {
        if(!this.active)
            return

        this.game.save.set('progress.tutorialCompleted', true, { immediate: true })
        this.close()
    }

    close()
    {
        if(!this.active)
            return

        this.active = false
        this.element.classList.remove('is-visible')
        this.element.setAttribute('aria-hidden', 'true')
        window.setTimeout(() => { this.element.hidden = true }, 220)

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

    render()
    {
        const step = STEPS[this.stepIndex]
        const mode = this.game.inputs.mode
        const controlText = mode === Inputs.MODE_TOUCH
            ? step.touch
            : mode === Inputs.MODE_GAMEPAD
                ? step.gamepad
                : step.desktop

        this.eyebrowElement.textContent = step.eyebrow
        this.titleElement.textContent = step.title
        this.copyElement.textContent = step.copy
        this.inputElement.textContent = controlText
        this.progressElement.style.setProperty('--tutorial-progress', `${((this.stepIndex + 1) / STEPS.length) * 100}%`)
        this.nextElement.textContent = this.stepIndex === STEPS.length - 1 ? 'Start driving' : 'Next'
        this.skipElement.textContent = this.stepIndex === STEPS.length - 1 ? 'Back' : 'Skip tutorial'
    }
}

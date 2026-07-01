import { Game } from './Game.js'

const describeController = (type = 'default') =>
{
    if(type === 'xbox')
        return 'Xbox-style controller'
    if(type === 'playstation')
        return 'PlayStation-style controller'
    return 'Controller'
}

export class ControllerStatus
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = this.game.domElement?.querySelector('.js-controller-status') ?? null
        this.labelElement = this.element?.querySelector('.js-controller-status-label') ?? null
        this.hideTimer = null

        this.game.inputs?.events.on('gamepadConnection', (detail) => this.handleConnection(detail))
        this.game.inputs?.gamepad?.events.on('typeChange', (type) =>
        {
            if(this.game.inputs.gamepad.connected)
                this.show(describeController(type), true)
        })

        const gamepad = this.game.inputs?.gamepad
        if(gamepad?.connected)
            this.show(describeController(gamepad.type), false)
    }

    handleConnection(detail)
    {
        if(detail?.connected)
        {
            this.show(describeController(detail.type), true)
            this.game.notifications?.show(
                `<div class="top"><div class="title">Controller connected</div></div><div class="bottom"><div class="description">${describeController(detail.type)} controls are ready.</div></div>`,
                'controller',
                4,
                () => this.game.menu.open('controls'),
                'controller-connected'
            )
            return
        }

        this.hide()
        this.game.notifications?.show(
            '<div class="top"><div class="title">Controller disconnected</div></div><div class="bottom"><div class="description">Keyboard and touch controls remain available.</div></div>',
            'controller',
            4,
            null,
            'controller-disconnected'
        )
    }

    show(label, autoHide = true)
    {
        if(!this.element)
            return

        if(this.hideTimer)
            clearTimeout(this.hideTimer)

        if(this.labelElement)
            this.labelElement.textContent = label

        this.element.hidden = false
        requestAnimationFrame(() => this.element.classList.add('is-visible'))

        if(autoHide)
            this.hideTimer = setTimeout(() => this.hide(), 4600)
    }

    hide()
    {
        if(!this.element)
            return

        if(this.hideTimer)
        {
            clearTimeout(this.hideTimer)
            this.hideTimer = null
        }

        this.element.classList.remove('is-visible')
        setTimeout(() =>
        {
            if(!this.element.classList.contains('is-visible'))
                this.element.hidden = true
        }, 220)
    }
}

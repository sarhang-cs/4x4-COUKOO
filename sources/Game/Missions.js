import { Game } from './Game.js'
import { Events } from './Events.js'
import { missions as missionDefinitions } from '../data/missions.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const whole = (value, fallback = 0) => Math.max(0, Math.floor(finite(value, fallback)))

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const createElement = (tag, className, text = null) =>
{
    const element = document.createElement(tag)
    if(className)
        element.className = className
    if(text !== null)
        element.textContent = text
    return element
}

export class Missions
{
    constructor()
    {
        this.game = Game.getInstance()
        this.events = new Events()
        this.definitions = missionDefinitions.map((definition) => ({ ...definition }))
        this.state = this.readState()
        this.lastDistance = this.game.player?.distanceDriven?.value ?? 0
        this.lastSaveAt = 0
        this.lastRenderAt = -Infinity
        this.dirty = false

        this.element = this.game.menu.items.get('garage')?.contentElement ?? null
        this.hudCoinsElement = this.game.domElement.querySelector('.js-coukoo-coins-value')
        this.missionElements = new Map()

        this.setUI()
        this.render(true)

        this.tickCallback = () => this.update()
        this.game.ticker.events.on('tick', this.tickCallback, 13)
        this.game.save.events.on('progressCleared', () => this.reset())
        this.game.save.events.on('synced', () =>
        {
            this.state = this.readState()
            this.render(true)
        })
    }

    readState()
    {
        const stored = this.game.save.get('progress.missions', {})
        const normalized = {}

        for(const definition of this.definitions)
        {
            const candidate = stored?.[definition.id] ?? {}
            normalized[definition.id] = {
                progress: clamp(finite(candidate.progress), 0, definition.target),
                completed: candidate.completed === true,
                completedAt: whole(candidate.completedAt),
            }

            if(normalized[definition.id].completed)
                normalized[definition.id].progress = definition.target
        }

        return normalized
    }

    getCoins()
    {
        return whole(this.game.save.get('progress.coins', 0))
    }

    getTotalCoins()
    {
        return whole(this.game.save.get('progress.totalCoins', 0))
    }

    canAfford(amount)
    {
        return this.getCoins() >= whole(amount)
    }

    spend(amount)
    {
        const cost = whole(amount)
        if(cost <= 0 || !this.canAfford(cost))
            return false

        this.game.save.set('progress.coins', this.getCoins() - cost, { immediate: true })
        this.events.trigger('coinsChange', [ this.getCoins(), this.getTotalCoins() ])
        this.render(true)
        return true
    }

    addCoins(amount)
    {
        const reward = whole(amount)
        if(reward <= 0)
            return

        const coins = this.getCoins() + reward
        const totalCoins = this.getTotalCoins() + reward
        this.game.save.set('progress.coins', coins, { immediate: true })
        this.game.save.set('progress.totalCoins', totalCoins, { immediate: true })
        this.events.trigger('coinsChange', [ coins, totalCoins ])
    }

    setUI()
    {
        if(!this.element)
            return

        const list = this.element.querySelector('.js-mission-list')
        if(!list)
            return

        for(const definition of this.definitions)
        {
            const card = createElement('article', 'mission-card')
            card.dataset.mission = definition.id

            const top = createElement('div', 'mission-card__top')
            const titleGroup = createElement('div', 'mission-card__title-group')
            const title = createElement('h3', 'mission-card__title', definition.title)
            const description = createElement('p', 'mission-card__description', definition.description)
            const reward = createElement('span', 'mission-card__reward', `+${definition.reward} coins`)
            titleGroup.append(title, description)
            top.append(titleGroup, reward)

            const progressRow = createElement('div', 'mission-card__progress-row')
            const progressText = createElement('span', 'mission-card__progress', '0 / 0')
            const status = createElement('span', 'mission-card__status', 'In progress')
            progressRow.append(progressText, status)

            const bar = createElement('div', 'mission-card__bar')
            bar.setAttribute('aria-hidden', 'true')
            const barFill = createElement('div', 'mission-card__bar-fill')
            bar.append(barFill)

            card.append(top, progressRow, bar)
            list.append(card)
            this.missionElements.set(definition.id, { card, progressText, status, barFill })
        }
    }

    update()
    {
        if(!this.game.player || this.game.time?.paused)
            return

        const distance = finite(this.game.player.distanceDriven?.value)
        const deltaDistance = Math.max(0, distance - this.lastDistance)
        this.lastDistance = distance
        const delta = Math.max(0, finite(this.game.ticker.deltaScaled))
        const speedKmH = Math.max(0, finite(this.game.physicalVehicle?.xzSpeed) * 3.6)
        let changed = false

        for(const definition of this.definitions)
        {
            const state = this.state[definition.id]
            if(!state || state.completed)
                continue

            let next = state.progress
            if(definition.type === 'distance')
                next += deltaDistance
            else if(definition.type === 'boost')
            {
                const boosting = finite(this.game.player.boosting)
                const moving = finite(this.game.physicalVehicle?.xzSpeed) > 3
                if(boosting > 0.25 && moving)
                    next += delta
            }
            else if(definition.type === 'speed')
                next = Math.max(next, speedKmH)

            next = clamp(next, 0, definition.target)
            if(next !== state.progress)
            {
                state.progress = next
                changed = true
            }

            if(next >= definition.target)
                this.complete(definition)
        }

        if(changed)
        {
            this.dirty = true
            if(this.game.ticker.elapsed - this.lastSaveAt >= 1)
                this.persist()
        }

        if(this.game.ticker.elapsed - this.lastRenderAt >= 0.25)
            this.render()
    }

    complete(definition)
    {
        const state = this.state[definition.id]
        if(!state || state.completed)
            return false

        state.progress = definition.target
        state.completed = true
        state.completedAt = Date.now()
        this.addCoins(definition.reward)
        this.persist(true)
        this.showCompletion(definition)
        this.events.trigger('missionCompleted', [ definition, this.snapshot() ])
        return true
    }

    persist(immediate = false)
    {
        if(!this.dirty && !immediate)
            return

        this.game.save.set('progress.missions', this.snapshot(), { immediate })
        this.dirty = false
        this.lastSaveAt = this.game.ticker.elapsed
    }

    reset()
    {
        this.state = this.readState()
        this.lastDistance = this.game.player?.distanceDriven?.value ?? 0
        this.dirty = false
        this.render(true)
        this.events.trigger('coinsChange', [ this.getCoins(), this.getTotalCoins() ])
    }

    snapshot()
    {
        const snapshot = {}
        for(const definition of this.definitions)
        {
            const state = this.state[definition.id]
            snapshot[definition.id] = {
                progress: state.progress,
                completed: state.completed,
                completedAt: state.completedAt,
            }
        }
        return snapshot
    }

    showCompletion(definition)
    {
        const html = `
            <div class="top">
                <div class="title">Mission complete</div>
                <div class="progress">+${definition.reward}</div>
            </div>
            <div class="bottom">
                <div class="description">${escapeHtml(definition.title)} · ${escapeHtml(definition.description)}</div>
                <div class="open-icon"></div>
            </div>
        `

        this.game.notifications.show(
            html,
            'mission',
            5,
            () => this.game.menu.open('garage'),
            `mission-${definition.id}`
        )
    }

    formatProgress(definition, value)
    {
        const progress = clamp(value, 0, definition.target)
        if(definition.unit === 's')
            return `${Math.floor(progress)} / ${definition.target} s`
        if(definition.unit === 'km/h')
            return `${Math.floor(progress)} / ${definition.target} km/h`
        return `${Math.floor(progress)} / ${definition.target} m`
    }

    render(force = false)
    {
        const elapsed = this.game.ticker?.elapsed ?? 0
        if(!force && elapsed - this.lastRenderAt < 0.2)
            return
        this.lastRenderAt = elapsed

        if(this.hudCoinsElement)
            this.hudCoinsElement.textContent = String(this.getCoins())

        for(const definition of this.definitions)
        {
            const state = this.state[definition.id]
            const elements = this.missionElements.get(definition.id)
            if(!state || !elements)
                continue

            const ratio = definition.target > 0 ? state.progress / definition.target : 0
            elements.card.classList.toggle('is-complete', state.completed)
            elements.progressText.textContent = this.formatProgress(definition, state.progress)
            elements.status.textContent = state.completed ? 'Complete' : 'In progress'
            elements.barFill.style.transform = `scaleX(${ratio})`
        }
    }
}

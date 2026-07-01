import { Game } from './Game.js'

const DAY_MS = 24 * 60 * 60 * 1000
const REWARDS = [ 25, 30, 35, 40, 50, 60, 75 ]

const toWhole = (value, fallback = 0) =>
{
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

const dateKey = (timestamp = Date.now()) =>
{
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const dayDistance = (fromKey, toKey) =>
{
    if(!fromKey || !toKey)
        return Infinity

    const from = new Date(`${fromKey}T00:00:00`).getTime()
    const to = new Date(`${toKey}T00:00:00`).getTime()
    if(!Number.isFinite(from) || !Number.isFinite(to))
        return Infinity

    return Math.round((to - from) / DAY_MS)
}

export class DailyRewards
{
    static REWARDS = REWARDS

    constructor()
    {
        this.game = Game.getInstance()
        this.element = this.game.menu.items.get('garage')?.contentElement?.querySelector('.js-daily-reward') ?? null
        this.claimElement = this.element?.querySelector('.js-daily-claim') ?? null
        this.statusElement = this.element?.querySelector('.js-daily-status') ?? null
        this.streakElement = this.element?.querySelector('.js-daily-streak') ?? null
        this.rewardElement = this.element?.querySelector('.js-daily-amount') ?? null
        this.lastPromptKey = null

        this.setUI()
        this.render()

        this.game.missions?.events.on('coinsChange', () => this.render())
        this.game.save.events.on('progressCleared', () => this.render())
        this.game.save.events.on('synced', () => this.render())

        this.game.ticker.wait(4, () => this.promptAvailableReward())
    }

    getState()
    {
        const raw = this.game.save.get('progress.dailyReward', {})
        return {
            lastClaimDay: typeof raw?.lastClaimDay === 'string' ? raw.lastClaimDay : null,
            streak: Math.min(REWARDS.length, toWhole(raw?.streak)),
            totalClaims: toWhole(raw?.totalClaims),
        }
    }

    getPreview(timestamp = Date.now())
    {
        const today = dateKey(timestamp)
        const state = this.getState()
        const alreadyClaimed = state.lastClaimDay === today
        const gap = dayDistance(state.lastClaimDay, today)
        const nextStreak = alreadyClaimed
            ? Math.max(1, state.streak)
            : gap === 1
                ? Math.min(REWARDS.length, Math.max(1, state.streak + 1))
                : 1
        const reward = REWARDS[nextStreak - 1]

        return { today, state, alreadyClaimed, nextStreak, reward }
    }

    claim()
    {
        const preview = this.getPreview()
        if(preview.alreadyClaimed)
            return false

        if(!this.game.missions?.addCoins)
            return false

        this.game.missions.addCoins(preview.reward)
        this.game.save.set('progress.dailyReward', {
            lastClaimDay: preview.today,
            streak: preview.nextStreak,
            totalClaims: preview.state.totalClaims + 1,
        }, { immediate: true })

        this.render()
        this.showClaimed(preview)
        return true
    }

    setUI()
    {
        this.claimElement?.addEventListener('click', () => this.claim())
    }

    promptAvailableReward()
    {
        const preview = this.getPreview()
        if(preview.alreadyClaimed || this.lastPromptKey === preview.today)
            return

        this.lastPromptKey = preview.today
        this.game.notifications.show(
            `<div class="top"><div class="title">Daily reward ready</div><div class="progress">+${preview.reward}</div></div><div class="bottom"><div class="description">Open the Garage to collect today’s reward.</div><div class="open-icon"></div></div>`,
            'daily-reward',
            6,
            () => this.game.menu.open('garage'),
            `daily-reward-${preview.today}`
        )
    }

    showClaimed(preview)
    {
        this.game.notifications.show(
            `<div class="top"><div class="title">Daily reward collected</div><div class="progress">+${preview.reward}</div></div><div class="bottom"><div class="description">Day ${preview.nextStreak} streak · come back tomorrow to continue.</div><div class="open-icon"></div></div>`,
            'daily-reward',
            5,
            () => this.game.menu.open('garage'),
            `daily-reward-claimed-${preview.today}`
        )
    }

    render()
    {
        if(!this.element)
            return

        const preview = this.getPreview()
        const currentStreak = preview.alreadyClaimed ? preview.state.streak : preview.nextStreak

        this.element.classList.toggle('is-claimed', preview.alreadyClaimed)
        if(this.streakElement)
            this.streakElement.textContent = `${Math.max(1, currentStreak)} / ${REWARDS.length} days`
        if(this.rewardElement)
            this.rewardElement.textContent = `+${preview.reward} coins`
        if(this.statusElement)
            this.statusElement.textContent = preview.alreadyClaimed
                ? 'Collected today · next reward unlocks tomorrow.'
                : `Ready now · day ${preview.nextStreak} reward.`
        if(this.claimElement)
        {
            this.claimElement.disabled = preview.alreadyClaimed
            this.claimElement.classList.toggle('is-disabled', preview.alreadyClaimed)
            this.claimElement.textContent = preview.alreadyClaimed ? 'Collected today' : 'Collect reward'
        }
    }
}

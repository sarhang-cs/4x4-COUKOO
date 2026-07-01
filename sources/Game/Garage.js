import { Game } from './Game.js'
import { VisualVehicle } from './World/VisualVehicle.js'

const VEHICLES = [
    {
        id: 'default',
        title: 'COUKOO 4X4',
        description: 'Your all-terrain starter vehicle, balanced for every part of the world.',
        price: 0,
        file: 'default',
        label: 'Owned',
    },
    {
        id: 'oldSchool',
        title: 'OLD SCHOOL',
        description: 'A retro 4X4 body for drivers who have earned their first long run.',
        price: 160,
        file: 'oldSchool',
        label: 'Unlock for 160 coins',
    },
]

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export class Garage
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = this.game.menu.items.get('garage')?.contentElement ?? null
        this.items = new Map()
        this.switching = false
        this.activeVehicle = this.getActiveVehicle()

        this.setUI()
        this.game.missions?.events.on('coinsChange', () => this.render())
        this.game.missions?.events.on('missionCompleted', () => this.render())
        this.game.save.events.on('progressCleared', () =>
        {
            const nextVehicle = this.getActiveVehicle()
            const changedVehicle = this.activeVehicle !== nextVehicle
            this.activeVehicle = nextVehicle
            this.render()

            if(changedVehicle)
                this.equip(nextVehicle, { silent: true, persist: false })
        })

        this.render()
        this.restoreVehicle()
    }

    getActiveVehicle()
    {
        const saved = this.game.save.get('progress.activeVehicle', 'default')
        return VEHICLES.some((vehicle) => vehicle.id === saved) ? saved : 'default'
    }

    isOwned(id)
    {
        if(id === 'default')
            return true
        return this.game.save.get(`progress.vehicles.${id}`, false) === true
    }

    setUI()
    {
        if(!this.element)
            return

        const list = this.element.querySelector('.js-garage-list')
        if(!list)
            return

        for(const vehicle of VEHICLES)
        {
            const card = document.createElement('article')
            card.className = 'garage-card'
            card.dataset.vehicle = vehicle.id

            const title = document.createElement('h3')
            title.className = 'garage-card__title'
            title.textContent = vehicle.title

            const description = document.createElement('p')
            description.className = 'garage-card__description'
            description.textContent = vehicle.description

            const bottom = document.createElement('div')
            bottom.className = 'garage-card__bottom'
            const status = document.createElement('span')
            status.className = 'garage-card__status'
            const button = document.createElement('button')
            button.className = 'garage-card__button button is-small'
            button.type = 'button'
            button.addEventListener('click', () => this.handleVehicle(vehicle.id))
            bottom.append(status, button)

            card.append(title, description, bottom)
            list.append(card)
            this.items.set(vehicle.id, { card, status, button })
        }
    }

    async handleVehicle(id)
    {
        const vehicle = VEHICLES.find((candidate) => candidate.id === id)
        if(!vehicle || this.switching)
            return

        if(!this.isOwned(id))
        {
            if(!this.game.missions?.spend(vehicle.price))
            {
                this.showNotice('Not enough coins', `Complete missions to earn ${vehicle.price} coins for ${vehicle.title}.`)
                return
            }

            this.game.save.set(`progress.vehicles.${id}`, true, { immediate: true })
            this.showNotice('Vehicle unlocked', `${vehicle.title} is now available in your garage.`)
        }

        await this.equip(id)
    }

    async restoreVehicle()
    {
        if(this.activeVehicle !== 'default' && this.isOwned(this.activeVehicle))
            await this.equip(this.activeVehicle, { silent: true, persist: false })
    }

    async equip(id, { silent = false, persist = true } = {})
    {
        const vehicle = VEHICLES.find((candidate) => candidate.id === id)
        if(!vehicle || !this.isOwned(id) || this.switching)
            return false

        if(this.activeVehicle === id && id === 'default')
        {
            this.render()
            return true
        }

        this.switching = true
        this.render()

        try
        {
            let model = this.game.resources.vehicle?.scene
            if(vehicle.file !== 'default')
            {
                const compressedModelSuffix = import.meta.env.VITE_COMPRESSED === '1' ? '-compressed' : ''
                const resources = await this.game.resourcesLoader.load([
                    [ 'garageVehicle', `vehicle/${vehicle.file}${compressedModelSuffix}.glb?garage=${Date.now()}`, 'gltf' ],
                ])
                model = resources.garageVehicle.scene
            }

            if(!model)
                throw new Error('Vehicle model was not available.')

            this.game.world.visualVehicle?.destroy()
            this.game.world.visualVehicle = new VisualVehicle(model)
            this.activeVehicle = id

            if(persist)
                this.game.save.set('progress.activeVehicle', id, { immediate: true })

            if(!silent)
                this.showNotice('Vehicle equipped', `${vehicle.title} is ready to drive.`)
            this.render()
            return true
        }
        catch(error)
        {
            console.error('Unable to equip vehicle.', error)
            if(!silent)
                this.showNotice('Vehicle unavailable', 'The selected vehicle could not be loaded. Your current vehicle is still active.')
            return false
        }
        finally
        {
            this.switching = false
            this.render()
        }
    }

    showNotice(title, description)
    {
        const html = `
            <div class="top"><div class="title">${escapeHtml(title)}</div></div>
            <div class="bottom"><div class="description">${escapeHtml(description)}</div></div>
        `
        this.game.notifications.show(html, 'garage', 4, () => this.game.menu.open('garage'), `garage-${title}`)
    }

    render()
    {
        const coins = this.game.missions?.getCoins?.() ?? 0
        const balance = this.element?.querySelector('.js-garage-coins')
        if(balance)
            balance.textContent = `${coins} coins`

        for(const vehicle of VEHICLES)
        {
            const item = this.items.get(vehicle.id)
            if(!item)
                continue

            const owned = this.isOwned(vehicle.id)
            const active = this.activeVehicle === vehicle.id
            const affordable = coins >= vehicle.price
            item.card.classList.toggle('is-owned', owned)
            item.card.classList.toggle('is-active', active)
            item.card.classList.toggle('is-locked', !owned)
            item.button.disabled = this.switching || (active && owned) || (!owned && !affordable)

            if(active)
            {
                item.status.textContent = 'Equipped'
                item.button.textContent = 'Equipped'
            }
            else if(owned)
            {
                item.status.textContent = 'Owned'
                item.button.textContent = 'Equip'
            }
            else if(affordable)
            {
                item.status.textContent = `${vehicle.price} coins`
                item.button.textContent = `Unlock · ${vehicle.price}`
            }
            else
            {
                item.status.textContent = `${vehicle.price - coins} more coins needed`
                item.button.textContent = 'Locked'
            }
        }
    }
}

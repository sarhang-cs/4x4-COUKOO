import { Events } from './Events.js'

const deviceClass = (userAgent = '') =>
{
    const value = userAgent.toLowerCase()
    if(/iphone|ipad|ipod/.test(value)) return 'ios'
    if(/samsung|sm-[a-z0-9]+|galaxy/.test(value)) return 'samsung'
    if(/redmi|xiaomi|poco|mi\s/.test(value)) return 'xiaomi'
    if(/vivo|iqoo/.test(value)) return 'vivo'
    if(/android/.test(value)) return 'android'
    return 'desktop'
}

export class Viewport
{
    constructor(domElement)
    {
        this.domElement = domElement
        this.events = new Events()
        this.userAgent = navigator.userAgent || ''
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(this.userAgent)
        this.visualViewport = window.visualViewport ?? null
        this.root = document.documentElement

        this.applyDeviceClasses()
        this.measure()
        this.setResize()
    }

    applyDeviceClasses()
    {
        const family = deviceClass(this.userAgent)
        const root = this.root
        root.classList.toggle('is-ios', family === 'ios')
        root.classList.toggle('is-samsung', family === 'samsung')
        root.classList.toggle('is-xiaomi', family === 'xiaomi')
        root.classList.toggle('is-vivo', family === 'vivo')
        root.classList.toggle('is-android', family === 'android' || family === 'samsung' || family === 'xiaomi' || family === 'vivo')
        root.classList.toggle('is-desktop', family === 'desktop')
    }

    measure()
    {
        const bounding = this.domElement.getBoundingClientRect()
        const visualWidth = this.visualViewport?.width
        const visualHeight = this.visualViewport?.height
        this.width = Math.max(1, Math.round(this.isMobile && visualWidth ? visualWidth : bounding.width))
        this.height = Math.max(1, Math.round(this.isMobile && visualHeight ? visualHeight : bounding.height))
        this.ratio = this.width / this.height

        this.pixelRatioPure = Math.max(1, window.devicePixelRatio || 1)
        this.pixelRatioMax = this.isMobile ? 1.5 : 3
        this.pixelRatio = Math.min(this.pixelRatioPure, this.pixelRatioMax)

        const shortSide = Math.min(this.width, this.height)
        const longSide = Math.max(this.width, this.height)
        const tallPhone = this.isMobile && longSide / shortSide >= 2
        const compactPhone = this.isMobile && shortSide <= 390
        const compactHeight = this.height <= 680

        this.root.style.setProperty('--coukoo-vw', `${this.width}px`)
        this.root.style.setProperty('--coukoo-vh', `${this.height}px`)
        this.root.style.setProperty('--coukoo-visual-scale', String(this.visualViewport?.scale ?? 1))
        this.root.classList.toggle('is-tall-phone', tallPhone)
        this.root.classList.toggle('is-compact-phone', compactPhone)
        this.root.classList.toggle('is-compact-height', compactHeight)
        this.root.classList.toggle('is-landscape', this.width > this.height)
        this.root.classList.toggle('is-portrait', this.width <= this.height)
    }

    setResize()
    {
        const throttleDuration = 280
        let throttleTimeout = null
        const update = () =>
        {
            this.measure()
            this.events.trigger('change')

            if(throttleTimeout)
                clearTimeout(throttleTimeout)

            throttleTimeout = setTimeout(() =>
            {
                throttleTimeout = null
                this.events.trigger('throttleChange')
            }, throttleDuration)
        }

        window.addEventListener('resize', update, { passive: true })
        window.addEventListener('orientationchange', update, { passive: true })
        this.visualViewport?.addEventListener('resize', update, { passive: true })
        this.visualViewport?.addEventListener('scroll', update, { passive: true })
    }
}

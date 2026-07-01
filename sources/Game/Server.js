import { Events } from './Events.js'
import { Game } from './Game.js'

const createSessionId = () =>
{
    if(globalThis.crypto?.randomUUID)
        return globalThis.crypto.randomUUID()

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const getStoredSessionId = () => Game.getInstance()?.save?.get('session.uuid', null) ?? null

const storeSessionId = (uuid) =>
{
    const save = Game.getInstance()?.save
    if(save)
        save.set('session.uuid', uuid, { immediate: true })
}

const getServerUrl = (value) =>
{
    if(!value)
        return null

    try
    {
        const url = new URL(value, window.location.href)
        return url.protocol === 'ws:' || url.protocol === 'wss:' ? url.href : null
    }
    catch(error)
    {
        console.warn('Invalid multiplayer server URL.', error)
        return null
    }
}

export class Server
{
    constructor()
    {
        this.game = Game.getInstance()

        // Unique session ID. Native crypto removes uuid from the player bundle.
        this.uuid = getStoredSessionId()
        if(!this.uuid)
        {
            this.uuid = createSessionId()
            storeSessionId(this.uuid)
        }

        this.connected = false
        this.isConnecting = false
        this.socket = null
        this.serverUrl = getServerUrl(import.meta.env.VITE_SERVER_URL)
        this.initData = null
        this.events = new Events()
        this.codec = null
        this.startPromise = null
        this.reconnectInterval = null
        document.documentElement.classList.add('is-server-offline')
    }

    async loadCodec()
    {
        if(this.codec)
            return this.codec

        const { decode, encode } = await import('@msgpack/msgpack')
        this.codec = { decode, encode }
        return this.codec
    }

    start()
    {
        if(this.startPromise)
            return this.startPromise

        if(!this.serverUrl)
            return Promise.resolve(false)

        this.startPromise = this.loadCodec()
            .then(() =>
            {
                this.connect()

                if(!this.reconnectInterval)
                {
                    this.reconnectInterval = setInterval(() =>
                    {
                        if(!this.connected && !this.isConnecting)
                            this.connect()
                    }, 2000)
                }

                return true
            })
            .catch((error) =>
            {
                this.startPromise = null
                console.warn('Server codec could not be loaded.', error)
                return false
            })

        return this.startPromise
    }

    connect()
    {
        if(!this.codec || !this.serverUrl || this.connected || this.isConnecting)
            return false

        this.isConnecting = true

        let socket = null
        try
        {
            socket = new WebSocket(this.serverUrl)
            socket.binaryType = 'arraybuffer'
        }
        catch(error)
        {
            this.isConnecting = false
            console.warn('Unable to open multiplayer connection.', error)
            return false
        }

        this.socket = socket

        socket.addEventListener('open', () =>
        {
            // Ignore a stale socket if a newer connection replaced it.
            if(this.socket !== socket)
            {
                socket.close()
                return
            }

            this.isConnecting = false
            this.connected = true
            document.documentElement.classList.remove('is-server-offline')
            document.documentElement.classList.add('is-server-online')
            this.events.trigger('connected')

            if(this.game.ticker.elapsed > 10)
            {
                const html = /* html */`
                    <div class="top">
                        <div class="title">Server connected</div>
                    </div>
                `

                this.game.notifications.show(
                    html,
                    'server-connected',
                    8,
                    null,
                    'server-connected'
                )
            }
        })

        socket.addEventListener('message', (message) =>
        {
            if(this.socket === socket)
                this.onReceive(message)
        })

        socket.addEventListener('error', (error) =>
        {
            if(this.socket === socket)
                console.warn('Multiplayer connection error.', error)
        })

        socket.addEventListener('close', () =>
        {
            if(this.socket !== socket)
                return

            const wasConnected = this.connected
            this.socket = null
            this.isConnecting = false
            this.connected = false
            document.documentElement.classList.add('is-server-offline')
            document.documentElement.classList.remove('is-server-online')

            // Do not interrupt startup with a notification for a connection that
            // never became available. The retry loop will handle it quietly.
            if(!wasConnected)
                return

            const html = /* html */`
                <div class="top">
                    <div class="title">Server disconnected</div>
                </div>
            `

            this.game.notifications.show(
                html,
                'server-disconnected',
                8,
                null,
                'server-disconnected'
            )

            this.events.trigger('disconnected')
        })

        return true
    }

    onReceive(message)
    {
        let data = null

        try
        {
            data = this.decode(message.data)
        }
        catch(error)
        {
            console.warn('Ignoring malformed multiplayer message.', error)
            return
        }

        if(!data || typeof data !== 'object' || Array.isArray(data))
        {
            console.warn('Ignoring invalid multiplayer payload.')
            return
        }

        if(this.initData === null)
            this.initData = data

        this.events.trigger('message', [ data ])
    }

    send(message)
    {
        if(!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN)
            return false

        try
        {
            this.socket.send(this.encode({ uuid: this.uuid, ...message }))
            return true
        }
        catch(error)
        {
            console.warn('Could not send multiplayer message.', error)
            return false
        }
    }

    decode(data)
    {
        return this.codec.decode(new Uint8Array(data))
    }

    encode(data)
    {
        return this.codec.encode(data)
    }
}

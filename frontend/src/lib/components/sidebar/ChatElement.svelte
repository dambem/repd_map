<script>
    export let chats = [];

    let isTyping = false;
    let displayedChats = [];
    let runId = 0;

    async function animateChats(messages) {
        const id = ++runId;
        displayedChats = [];
        for (const message of messages) {
            isTyping = true;
            await new Promise((resolve) => setTimeout(resolve, 900));
            if (id !== runId) return; // a newer selection superseded this run
            isTyping = false;
            displayedChats = [...displayedChats, message];
            await new Promise((resolve) => setTimeout(resolve, 300));
        }
    }

    $: if (chats.length > 0) animateChats(chats);
</script>

<div class="ceg-card chat">
    <div class="avatar font-display">C.E.G</div>
    <div class="messages">
        {#each displayedChats as chat}
            <p class="bubble">{chat}</p>
        {/each}
        {#if isTyping}
            <p class="bubble typing">
                <span></span><span></span><span></span>
            </p>
        {/if}
        <p class="disclaimer font-data">Analysis by C.E.G — it may well be wrong.</p>
    </div>
</div>

<style>
    .chat {
        display: flex;
        gap: 0.7rem;
        padding: 0.85rem 1rem;
    }
    .avatar {
        flex-shrink: 0;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--ceg-ink);
        color: var(--ceg-bone);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 700;
    }
    .messages {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .bubble {
        background: var(--ceg-parchment);
        border: 1px solid var(--ceg-rule);
        border-radius: 3px 10px 10px 10px;
        padding: 0.55rem 0.7rem;
        font-size: 0.76rem;
        line-height: 1.5;
        color: var(--ceg-ink);
    }
    .typing {
        display: flex;
        gap: 4px;
        width: fit-content;
    }
    .typing span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--ceg-ink-soft);
        animation: bounce 1s infinite;
    }
    .typing span:nth-child(2) {
        animation-delay: 0.15s;
    }
    .typing span:nth-child(3) {
        animation-delay: 0.3s;
    }
    @keyframes bounce {
        0%,
        60%,
        100% {
            transform: translateY(0);
        }
        30% {
            transform: translateY(-4px);
        }
    }
    .disclaimer {
        font-size: 0.6rem;
        color: var(--ceg-ink-soft);
        opacity: 0.75;
        margin-top: 0.1rem;
    }
</style>

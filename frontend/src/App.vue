<template>
  <div class="app-shell" :class="{ 'nav-open': mobileNavOpen }" @dragenter.prevent="dragEnter" @dragover.prevent="dragOver" @dragleave.prevent="dragLeave" @drop.prevent="dropFiles">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileNavOpen }">
      <div class="brand-row"><div class="brand-mark"><span></span><span></span><span></span></div><span v-if="!sidebarCollapsed" class="brand-name">KNOWLEDGE <b>SYSTEMS</b></span><button class="icon-button collapse-toggle" title="Collapse sidebar" @click="sidebarCollapsed = !sidebarCollapsed"><SidebarSimple :size="18" /></button></div>
      <div class="sidebar-main-actions">
        <button class="side-action new-chat" @click="newChat"><Plus :size="17"/><span v-if="!sidebarCollapsed">New chat</span><kbd v-if="!sidebarCollapsed">⌘ K</kbd></button>
        <button class="side-action" @click="searchOpen = !searchOpen"><MagnifyingGlass :size="17"/><span v-if="!sidebarCollapsed">Search</span><kbd v-if="!sidebarCollapsed">⌘ /</kbd></button>
        <input v-if="searchOpen && !sidebarCollapsed" v-model="chatSearch" class="sidebar-search" placeholder="Search conversations…" autofocus />
        <button class="side-action" :class="{ selected: section === 'chats' }" @click="section = 'chats'; mobileNavOpen = false"><ChatCircleText :size="17"/><span v-if="!sidebarCollapsed">Chats</span></button>
        <button class="side-action" :class="{ selected: section === 'library' }" @click="section = 'library'; mobileNavOpen = false"><Books :size="17"/><span v-if="!sidebarCollapsed">Library</span><span v-if="!sidebarCollapsed" class="nav-count">{{ documents.length }}</span></button>
        <button class="side-action" @click="section = 'chats'; mobileNavOpen = false"><ClockCounterClockwise :size="17"/><span v-if="!sidebarCollapsed">Recent activity</span></button>
      </div>
      <div v-if="!sidebarCollapsed" class="history-head"><span>RECENT</span><button class="icon-button" title="New chat" @click="newChat"><Plus :size="15"/></button></div>
      <div v-if="!sidebarCollapsed" class="history-list">
        <div class="date-label">TODAY</div>
        <button v-for="chat in filteredChats" :key="chat.id" class="history-item" :class="{ active: activeChatId === chat.id && section === 'chats' }" @click="openChat(chat.id)"><span class="history-title">{{ chat.title }}</span><span class="history-menu" @click.stop="selectedChatMenu = selectedChatMenu === chat.id ? '' : chat.id"><DotsThree :size="17"/></span><div v-if="selectedChatMenu === chat.id" class="context-menu"><button @click.stop="renameChat(chat)"><PencilSimple :size="14"/> Rename</button><button class="danger" @click.stop="deleteChat(chat.id)"><Trash :size="14"/> Delete</button></div></button>
        <div class="date-label older-label">YESTERDAY</div>
        <button v-for="chat in olderChats" :key="chat.id" class="history-item" :class="{ active: activeChatId === chat.id && section === 'chats' }" @click="openChat(chat.id)"><span class="history-title">{{ chat.title }}</span></button>
      </div>
      <div class="sidebar-bottom">
        <button class="side-action" @click="settingsOpen = !settingsOpen"><GearSix :size="17"/><span v-if="!sidebarCollapsed">Settings</span></button>
        <button class="side-action" @click="toggleTheme"><Sun v-if="isDark" :size="17"/><Moon v-else :size="17"/><span v-if="!sidebarCollapsed">{{ isDark ? 'Light appearance' : 'Dark appearance' }}</span></button>
        <button class="profile-row"><div class="avatar">A</div><template v-if="!sidebarCollapsed"><span class="profile-text"><b>Alex Morgan</b><small>Personal workspace</small></span><DotsThree :size="17"/></template></button>
      </div>
    </aside>
    <button v-if="mobileNavOpen" class="mobile-scrim" aria-label="Close navigation" @click="mobileNavOpen = false"></button>

    <main class="main-panel">
      <header class="topbar"><button class="icon-button mobile-menu" title="Open navigation" @click="mobileNavOpen = true"><List :size="20"/></button><div v-if="section === 'chats'" class="conversation-heading"><button class="conversation-title-button" @click="titleMenu = !titleMenu">{{ activeChat?.title || 'New conversation' }}<CaretDown :size="14"/></button><span class="workspace-pill"><span class="status-dot" :class="{ offline: !backendOnline }"></span> {{ backendOnline ? 'Personal' : 'Backend offline' }}</span></div><div v-else class="conversation-heading"><span class="page-title">Library</span><span class="workspace-pill">{{ documents.length }} source{{ documents.length === 1 ? '' : 's' }}</span></div><div class="top-actions"><button class="header-context" v-if="section === 'chats' && activeChat?.attachments?.length" @click="section = 'library'"><Files :size="15"/> {{ activeChat.attachments.length }} sources</button><button class="icon-button" title="Search" @click="searchOpen = !searchOpen"><MagnifyingGlass :size="18"/></button><button class="icon-button" title="More options" @click="settingsOpen = !settingsOpen"><DotsThree :size="20"/></button></div></header>
      <div v-if="titleMenu" class="title-popover"><button @click="renameChat(activeChat); titleMenu = false"><PencilSimple :size="15"/> Rename conversation</button><button @click="newChat(); titleMenu = false"><Plus :size="15"/> New conversation</button></div>

      <section v-if="section === 'chats'" class="chat-workspace">
        <div ref="scrollArea" class="message-scroll" @scroll="handleScroll">
          <div v-if="!activeChat || !activeChat.messages.length" class="welcome-state">
            <div class="welcome-glyph"><div class="brand-mark large"><span></span><span></span><span></span></div></div>
            <p class="eyebrow">KNOWLEDGE SYSTEMS · RESEARCH WORKSPACE</p><h1>Think clearly.<br/><span>Find what matters.</span></h1><p class="welcome-copy">Ask a question across your research, or bring your documents into the conversation.</p>
            <div class="suggestion-list"><button v-for="(suggestion, i) in suggestions" :key="suggestion" @click="useSuggestion(suggestion)"><span class="suggestion-index">0{{ i + 1 }}</span><span>{{ suggestion }}</span><ArrowUpRight :size="16"/></button></div>
          </div>
          <div v-else class="conversation-content">
            <article v-for="(message, index) in activeChat.messages" :key="message.id" class="message" :class="message.role">
              <div class="message-author"><span v-if="message.role === 'assistant'" class="assistant-mark"><span></span><span></span></span><span v-else class="user-avatar">You</span><span>{{ message.role === 'assistant' ? 'Research assistant' : 'You' }}</span><span class="message-meta" v-if="message.role === 'assistant'">{{ message.mode === 'DIRECT' ? 'DIRECT' : 'SYNTHESIS' }}</span></div>
              <div class="message-body" v-if="message.role === 'user'"><p>{{ message.text }}</p><div v-if="message.attachments?.length" class="message-files"><span v-for="file in message.attachments" :key="file.name" class="message-file"><FilePdf v-if="file.extension === 'PDF'" :size="16"/><ImageSquare v-else-if="file.isImage" :size="16"/><FileText v-else :size="16"/>{{ file.name }}</span></div></div>
              <div v-else class="message-body assistant-body">
                <template v-for="(block, bi) in message.blocks" :key="bi">
                  <component v-if="block.type === 'heading'" :is="`h${Math.min(block.level || 2, 3)}`">{{ block.text }}</component>
                  <p v-else-if="block.type === 'paragraph'" class="answer-paragraph"><template v-for="(segment, si) in block.segments" :key="si"><span v-if="segment.type === 'text'">{{ segment.value }}</span><button v-else-if="segment.type === 'cite'" class="citation" @click="toggleCitation(segment.id)">[{{ citationNumber(segment.id) }}]</button></template></p>
                  <pre v-else-if="block.type === 'code'"><code>{{ block.text }}</code></pre>
                </template>
                <p v-if="message.streaming || message.stopped" class="streaming-indicator"><span class="stream-dot"></span> {{ message.stopped ? 'Generation stopped' : 'Thinking through your sources' }}</p>
                <div v-if="message.citationOpen" class="citation-drawer"><div class="citation-heading"><span>Sources in this answer</span><button class="icon-button" @click="message.citationOpen = false"><X :size="16"/></button></div><button v-for="cite in citationsFor(message.blocks)" :key="cite.id" class="source-row" @click="toggleSource(cite.id)"><div class="source-number">{{ citationNumber(cite.id) }}</div><div class="source-info"><b>{{ cite.docTitle }}</b><small>Page {{ cite.page }} · {{ cite.chunkId }}</small><p v-if="activeSource === cite.id">“{{ cite.excerpt }}”</p></div><CaretDown :size="15"/></button></div>
                <div class="message-actions" v-if="!message.streaming"><button title="Copy response" @click="copyMessage(message)"><Copy :size="15"/></button><button title="Regenerate response" @click="regenerate(message)"><ArrowClockwise :size="15"/></button><button title="Helpful" :class="{ reacted: message.feedback === 'up' }" @click="message.feedback = message.feedback === 'up' ? '' : 'up'"><ThumbsUp :size="15"/></button><button title="Not helpful" :class="{ reacted: message.feedback === 'down' }" @click="message.feedback = message.feedback === 'down' ? '' : 'down'"><ThumbsDown :size="15"/></button><button v-if="citationsFor(message.blocks).length" title="View sources" @click="message.citationOpen = !message.citationOpen"><BookOpenText :size="15"/><span>Sources</span></button><span v-if="copiedMessage === message.id" class="copied-note">Copied</span></div>
              </div>
            </article>
            <div ref="bottomAnchor"></div>
          </div>
        </div>
        <div class="composer-area">
          <div v-if="!backendOnline" class="backend-warning"><WarningCircle :size="15"/><span>Backend unreachable on port 8000 — start the FastAPI server to get answers.</span><button title="Retry connection" @click="checkBackend">Retry</button></div>
          <div v-if="activeChat?.attachments?.length" class="context-strip"><span class="context-dot"></span><span>Using {{ activeChat.attachments.length }} source{{ activeChat.attachments.length === 1 ? '' : 's' }}</span><button v-for="file in activeChat.attachments" :key="file.name" @click="removeContext(file.name)">{{ file.name }} <X :size="12"/></button><button class="add-context" @click="section = 'library'">Add source <Plus :size="13"/></button></div>
          <div class="composer-wrap" :class="{ focused: composerFocused, 'has-files': attachments.length }">
            <div v-if="attachments.length" class="attachment-strip"><div v-for="item in attachments" :key="item.id" class="attachment-chip"><img v-if="item.preview" :src="item.preview" :alt="item.name"/><div v-else class="file-badge"><FilePdf v-if="item.extension === 'PDF'" :size="17"/><FileText v-else :size="17"/></div><div class="attachment-meta"><b>{{ item.name }}</b><small>{{ item.extension }} · {{ formatBytes(item.size) }} <span v-if="item.status === 'processing'">· Indexing…</span></small></div><button class="remove-file" title="Remove attachment" @click="removeAttachment(item.id)"><X :size="14"/></button></div></div>
            <textarea ref="composerInput" v-model="draft" rows="1" :placeholder="activeChat?.messages.length ? 'Ask a follow-up or explore another angle…' : 'Ask a question, explore an idea, or bring in your research…'" @keydown="composerKeydown" @focus="composerFocused = true" @blur="composerFocused = false" @input="resizeComposer"></textarea>
            <div v-if="attachmentMenuOpen" class="attachment-menu"><button @click="openFilePicker('all')"><Paperclip :size="17"/><span><b>Add a PDF</b><small>Indexed by the backend</small></span><ArrowUpRight :size="15"/></button><button @click="attachmentMenuOpen = false; section = 'library'"><Books :size="17"/><span><b>Browse library</b><small>Choose added sources</small></span><ArrowUpRight :size="15"/></button></div>
            <div class="composer-toolbar"><div class="toolbar-left"><button class="plus-button" title="Add attachments" @click="attachmentMenuOpen = !attachmentMenuOpen"><Plus :size="19"/></button><div class="mode-select"><button @click="modeMenuOpen = !modeMenuOpen"><Sparkle :size="15"/><span>{{ mode === 'SYNTHESIS' ? 'Synthesis' : 'Direct' }}</span><CaretDown :size="13"/></button><div v-if="modeMenuOpen" class="mode-menu"><button :class="{ chosen: mode === 'SYNTHESIS' }" @click="mode = 'SYNTHESIS'; modeMenuOpen = false"><Sparkle :size="15"/><span><b>Synthesis</b><small>Deep reasoning across sources</small></span></button><button :class="{ chosen: mode === 'DIRECT' }" @click="mode = 'DIRECT'; modeMenuOpen = false"><Lightning :size="15"/><span><b>Direct</b><small>Concise, focused answers</small></span></button></div></div></div><div class="toolbar-right"><span class="composer-hint">↵ to send</span><button v-if="isStreaming" class="send-button stop-button" title="Stop generation" @click="stopGeneration"><Stop :size="15"/></button><button v-else class="send-button" :disabled="!draft.trim() && !attachments.length" title="Send message" @click="sendMessage"><ArrowUp :size="18"/></button></div></div>
          </div><p class="disclaimer">Answers are generated from your workspace and may need verification.</p>

        </div>
      </section>

      <section v-else class="library-workspace"><div class="library-heading"><div><p class="eyebrow">YOUR RESEARCH COLLECTION</p><h1>Library</h1><p>Sources, indexed and ready to reason across.</p>
            <p v-if="!backendOnline" class="library-offline">Backend unreachable, so no indexed sources can be listed. <button @click="checkBackend">Retry</button></p></div><button class="library-add" @click="openFilePicker('all')"><Plus :size="17"/> Add documents</button></div><div class="library-controls"><label class="library-search"><MagnifyingGlass :size="17"/><input v-model="librarySearch" placeholder="Search your library" /></label><div class="filter-select"><FunnelSimple :size="15"/><select v-model="typeFilter"><option value="All">All types</option><option>PDF</option><option>MD</option><option>DOCX</option><option>CSV</option><option>Image</option></select><CaretDown :size="13"/></div></div><div class="document-list"><div class="document-list-head"><span>DOCUMENT</span><span>ADDED</span><span>STATUS</span><span>CHUNKS</span><span></span></div><button v-for="doc in filteredDocuments" :key="doc.id" class="document-row" @click="selectedDocument = doc"><span class="doc-main"><span class="doc-icon"><FilePdf v-if="doc.type === 'PDF'" :size="19"/><ImageSquare v-else-if="doc.type === 'Image'" :size="19"/><FileText v-else :size="19"/></span><span><b>{{ doc.filename }}</b><small>{{ doc.author || 'Added to your workspace' }} · {{ doc.type }}</small></span></span><span class="doc-date">{{ formatDate(doc.date) }}</span><span class="doc-status"><i></i>{{ doc.status || 'INDEXED' }}</span><span class="doc-chunks">{{ doc.chunks || 0 }}</span><span class="doc-more" @click.stop="removeDocument(doc.id)"><Trash :size="16"/></span></button><div v-if="!filteredDocuments.length" class="empty-library">{{ documents.length ? 'No documents match your search.' : 'No documents indexed yet. File upload is not exposed by the backend.' }}</div></div><div v-if="selectedDocument" class="details-backdrop" @click.self="selectedDocument = null"><aside class="document-details"><div class="details-top"><button class="icon-button" @click="selectedDocument = null"><ArrowLeft :size="18"/></button><button class="icon-button" title="Remove document" @click="removeDocument(selectedDocument.id)"><Trash :size="17"/></button></div><div class="details-icon"><FilePdf v-if="selectedDocument.type === 'PDF'" :size="26"/><FileText v-else :size="26"/></div><p class="eyebrow">DOCUMENT DETAILS</p><h2>{{ selectedDocument.filename }}</h2><div class="details-status"><i></i>{{ selectedDocument.status || 'INDEXED' }}</div><dl><div><dt>File type</dt><dd>{{ selectedDocument.type }}</dd></div><div><dt>Added</dt><dd>{{ formatDate(selectedDocument.date) }}</dd></div><div><dt>Indexed chunks</dt><dd>{{ selectedDocument.chunks || 0 }}</dd></div><div><dt>Pages</dt><dd>{{ selectedDocument.pages || '—' }}</dd></div><div><dt>Author</dt><dd>{{ selectedDocument.author || '—' }}</dd></div></dl><button class="use-source" @click="attachLibraryDoc(selectedDocument)"><Plus :size="16"/> Use in conversation</button></aside></div></section>
    </main>

    <div v-if="dragActive" class="drop-overlay"><div class="drop-panel"><div class="drop-icon"><UploadSimple :size="26"/></div><p class="eyebrow">KNOWLEDGE SYSTEMS</p><h2>Drop files to add<br/>to conversation</h2><p>PDFs, documents, images, and more</p></div></div>
    <Transition name="toast"><div v-if="fileError" class="error-toast"><WarningCircle :size="18"/><span>{{ fileError }}</span><button title="Dismiss" @click="dismissError"><X :size="15"/></button></div></Transition>
    <div v-if="previewDocument" class="details-backdrop" @click.self="previewDocument = null"><aside class="document-details source-preview" role="dialog" aria-label="Extracted source text"><div class="details-top"><button class="icon-button" title="Close" @click="previewDocument = null"><ArrowLeft :size="18"/></button><button class="icon-button" title="Use in conversation" @click="attachLibraryDoc(documents.find(doc => doc.id === previewDocument.id)); previewDocument = null"><Plus :size="17"/></button></div><p class="eyebrow">EXTRACTED TEXT</p><h2>{{ previewDocument.filename }}</h2><div class="details-status"><i></i>READY · {{ (previewDocument.chars || 0).toLocaleString() }} CHARACTERS</div><pre class="source-preview-text">{{ previewDocument.text || 'The backend extracted no text from this file.' }}</pre></aside></div>
    <div v-if="settingsOpen" class="click-away" @click="settingsOpen = false"></div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { PhArrowClockwise as ArrowClockwise, PhArrowLeft as ArrowLeft, PhArrowUp as ArrowUp, PhArrowUpRight as ArrowUpRight, PhBookOpenText as BookOpenText, PhBooks as Books, PhCaretDown as CaretDown, PhChatCircleText as ChatCircleText, PhClockCounterClockwise as ClockCounterClockwise, PhCopy as Copy, PhDotsThree as DotsThree, PhFilePdf as FilePdf, PhFileText as FileText, PhFiles as Files, PhFunnelSimple as FunnelSimple, PhGearSix as GearSix, PhImageSquare as ImageSquare, PhLightning as Lightning, PhList as List, PhMagnifyingGlass as MagnifyingGlass, PhMoon as Moon, PhPaperclip as Paperclip, PhPencilSimple as PencilSimple, PhPlus as Plus, PhSidebarSimple as SidebarSimple, PhSparkle as Sparkle, PhStop as Stop, PhSun as Sun, PhThumbsDown as ThumbsDown, PhThumbsUp as ThumbsUp, PhTrash as Trash, PhUploadSimple as UploadSimple, PhWarningCircle as WarningCircle, PhX as X } from '@phosphor-icons/vue'
import { checkHealth, sendChatMessage, describeError } from './api.js'
import { parseReply, blockCharCount } from './replyRenderer.js'
import { useIngestion } from './composables/useIngestion.js'
import { useStreamEngine } from './composables/useStreamEngine.js'

const MAX_SOURCE_CHARS = 24000
const HEALTH_POLL_MS = 30000
const isDark = ref(true)
const sidebarCollapsed = ref(false)
const mobileNavOpen = ref(false)
const section = ref('chats')
const searchOpen = ref(false)
const chatSearch = ref('')
const librarySearch = ref('')
const typeFilter = ref('All')
const selectedChatMenu = ref('')
const titleMenu = ref(false)
const settingsOpen = ref(false)
const attachmentMenuOpen = ref(false)
const modeMenuOpen = ref(false)
const composerFocused = ref(false)
const draft = ref('')
const mode = ref('SYNTHESIS')
const attachments = ref([])
const documents = ref([])
const selectedDocument = ref(null)
const fileError = ref('')
const copiedMessage = ref('')
const activeSource = ref('')
const dragDepth = ref(0)
const dragActive = computed(() => dragDepth.value > 0)

const composerInput = ref(null)
const fileInput = ref(null)
const scrollArea = ref(null)
const isStreaming = ref(false)
const previewDocument = ref(null)
let toastTimer = null
let dragResetTimer = null
let messageSequence = 0
let activeChatRequest = null
let healthTimer = null
const backendOnline = ref(true)
const libraryTypeFilter = true // every source is a PDF; the type filter has one real option

// The reveal engine pushes edits into the message it is writing; state is
// pulled on each tick rather than deep-watched. Uploads feed the library.
const engine = useStreamEngine({ onChange: () => { if (activeChatId.value) flushTick() } })
const ingestion = useIngestion()
let pendingReply = null
let pendingChat = null

const chats = ref([])
const activeChatId = ref('')
const activeChat = computed(() => chats.value.find(chat => chat.id === activeChatId.value))
const filteredChats = computed(() => chats.value.filter(chat => chat.dateGroup === 'today' && chat.title.toLowerCase().includes(chatSearch.value.toLowerCase())))
const olderChats = computed(() => chats.value.filter(chat => chat.dateGroup !== 'today' && chat.title.toLowerCase().includes(chatSearch.value.toLowerCase())))
const suggestions = ['Explain how retrieval-augmented generation works', 'What are the trade-offs of hybrid search?', 'How should I evaluate RAG quality?']
const filteredDocuments = computed(() => documents.value.filter(doc => {
  const matchesSearch = doc.filename.toLowerCase().includes(librarySearch.value.toLowerCase())
  // Only PDFs can be read by the backend today, so that is the only real filter.
  const matchesType = libraryTypeFilter.value
  return matchesSearch && matchesType
}))

function newChat() {
  const id = `chat-${Date.now()}`
  chats.value.unshift({ id, title: 'New conversation', dateGroup: 'today', messages: [], attachments: [], created: Date.now() })
  activeChatId.value = id
  section.value = 'chats'
  mobileNavOpen.value = false
  nextTick(() => composerInput.value?.focus())
}
function openChat(id) { activeChatId.value = id; section.value = 'chats'; mobileNavOpen.value = false; selectedChatMenu.value = '' }
function renameChat(chat) {
  if (!chat) return
  const value = window.prompt('Rename conversation', chat.title)
  if (value?.trim()) chat.title = value.trim()
  selectedChatMenu.value = ''
}
function deleteChat(id) {
  chats.value = chats.value.filter(chat => chat.id !== id)
  if (activeChatId.value === id) activeChatId.value = chats.value[0]?.id || ''
  selectedChatMenu.value = ''
}
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}
function useSuggestion(text) { draft.value = text; nextTick(() => { resizeComposer(); sendMessage() }) }
function resizeComposer() {
  const el = composerInput.value
  if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 180)}px` }
}
function composerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage() }
}
function nearBottom() {
  const el = scrollArea.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 140
}
function handleScroll() { /* The reveal only follows the text while the reader is still at the bottom. */ }
function scrollToBottom(force = false) {
  if (!force && !autoFollow) return
  nextTick(() => { if (scrollArea.value) scrollArea.value.scrollTo({ top: scrollArea.value.scrollHeight, behavior: 'smooth' }) })
}
function plainText(blocks) {
  return (blocks || []).map(block => block.type === 'paragraph' ? (block.segments || []).map(s => s.type === 'text' ? s.value : '').join('') : block.text).join('\n\n')
}
let autoFollow = true

async function checkBackend() {
  try {
    await checkHealth()
    backendOnline.value = true
  } catch (error) {
    backendOnline.value = false
    console.error('Backend health check failed:', error)
  }
}

/**
 * The backend's /chat takes one message, so the selected sources are folded
 * into this request as context. They never become user-facing chat messages.
 */
function buildPrompt(question) {
  const chat = activeChat.value
  const sources = (chat?.attachments || []).map(name => documents.value.find(doc => doc.filename === name)).filter(Boolean)
  if (!sources.length) return question
  const budget = Math.floor(MAX_SOURCE_CHARS / sources.length)
  const excerpts = sources.map(doc => {
    const body = doc.text.length > budget ? `${doc.text.slice(0, budget)}\n[…truncated]` : doc.text
    return `--- SOURCE: ${doc.filename} ---\n${body}`
  })
  return `Context from the user's workspace documents:\n\n${excerpts.join('\n\n')}\n\nQuestion: ${question}`
}

function setMessageBlocks(message, blocks) {
  message.blocks = blocks
  // Nudging a sibling value is what makes the template re-render mid-reveal.
  message.revision = (message.revision || 0) + 1
}

/** Copy the engine's current prefix into the message being written. */
function flushTick() {
  if (!pendingReply) return
  const message = pendingChat?.messages.find(item => item.id === pendingReply.id)
  if (!message) return
  setMessageBlocks(message, engine.getBlocks() || [])
  scrollToBottom()
}

function finishReply(message, { stopped = false } = {}) {
  message.streaming = false
  if (stopped) message.stopped = true
  else message.done = true
  pendingReply = null
  pendingChat = null
  isStreaming.value = false
  nextTick(scrollToBottom)
}

async function sendMessage(options = {}) {
  if (isStreaming.value) return
  const { regenerate = false, skipAttachments = false } = typeof options === 'object' ? options : {}
  const hasFreshFiles = !skipAttachments && attachments.value.length
  if (!draft.value.trim() && !hasFreshFiles) return
  if (!activeChat.value) newChat()
  const chat = activeChat.value
  const text = draft.value.trim() || 'Summarize the attached document.'
  // On regenerate the question is already in the thread and stays put; only the
  // answer is replaced in place, so we never duplicate the user's message.
  let replyIndex = chat.messages.length
  if (!regenerate) {
    chat.messages.push({ id: `user-${++messageSequence}`, role: 'user', text, attachments: hasFreshFiles ? attachments.value.map(item => ({ name: item.name, extension: item.extension })) : [], mode: mode.value })
    replyIndex = chat.messages.length
  }
  if (chat.title === 'New conversation') chat.title = text.slice(0, 44) || 'Research conversation'
  draft.value = ''
  if (composerInput.value) composerInput.value.style.height = 'auto'
  const prompt = buildPrompt(text)
  const assistant = { id: `assistant-${++messageSequence}`, role: 'assistant', mode: mode.value, blocks: [], streaming: true, citationOpen: false, feedback: '' }
  chat.messages.splice(replyIndex, 0, assistant)
  const requestController = new AbortController()
  activeChatRequest = requestController
  pendingReply = { id: assistant.id }
  pendingChat = chat
  isStreaming.value = true
  autoFollow = true
  scrollToBottom(true)

  try {
    const reply = await sendChatMessage(prompt, { signal: requestController.signal })
    if (requestController.signal.aborted) return
    backendOnline.value = true
    // The reply is in hand; reveal it. Until it is, the message shows as thinking.
    engine.startStream(parseReply(reply), {
      onComplete: () => finishReply(assistant),
      onCancel: () => finishReply(assistant, { stopped: true }),
    })
  } catch (error) {
    if (requestController.signal.aborted || error.code === 'ERR_CANCELED') return
    backendOnline.value = Boolean(error.response)
    setMessageBlocks(assistant, [{ type: 'paragraph', segments: [{ type: 'text', value: `Could not get a response from the backend: ${describeError(error)}` }] }])
    finishReply(assistant, { stopped: true })
    console.error('Backend chat request failed:', error)
  } finally {
    if (activeChatRequest === requestController) activeChatRequest = null
  }
}
function stopGeneration() {
  // Hang up on the request and freeze the reveal where it stands.
  activeChatRequest?.abort()
  activeChatRequest = null
  if (engine.isStreaming.value) {
    engine.cancelStream()
  } else if (pendingReply) {
    const message = pendingChat?.messages.find(item => item.id === pendingReply.id)
    if (message) {
      if (!message.blocks.length) setMessageBlocks(message, [{ type: 'paragraph', segments: [{ type: 'text', value: 'Generation stopped before the backend answered.' }] }])
      finishReply(message, { stopped: true })
    }
  }
  isStreaming.value = false
}
function regenerate(message) {
  const chat = activeChat.value
  if (!chat || isStreaming.value) return
  const assistantIndex = chat.messages.indexOf(message)
  const user = chat.messages[assistantIndex - 1]
  if (!user) return
  chat.messages.splice(assistantIndex, 1)
  // Queue the prompt without a full round-trip through the reactive textarea,
  // so we can send immediately and the draft never flashes the answer back.
  draft.value = user.text
  sendMessage({ regenerate: true })
}
function toggleCitation(id) { activeSource.value = activeSource.value === id ? '' : id }
function toggleSource(id) { activeSource.value = activeSource.value === id ? '' : id }
function citationNumber(id) { return id }
function citationsFor() { return [] }
async function copyMessage(message) {
  const value = plainText(message.blocks)
  try { await navigator.clipboard.writeText(value) } catch { const area = document.createElement('textarea'); area.value = value; document.body.append(area); area.select(); document.execCommand('copy'); area.remove() }
  copiedMessage.value = message.id
  window.setTimeout(() => { copiedMessage.value = '' }, 1600)
}
function openFilePicker() {
  attachmentMenuOpen.value = false
  showError('The backend does not expose a document upload endpoint, so file attachments are unavailable. Documents must be ingested on the server.')
}
function addFiles(fileList) {
  if (Array.from(fileList || []).length) openFilePicker()
}
function removeAttachment(id) {
  const item = attachments.value.find(file => file.id === id)
  if (item?.preview) URL.revokeObjectURL(item.preview)
  attachments.value = attachments.value.filter(file => file.id !== id)
}
function showError(message) { fileError.value = message; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { fileError.value = '' }, 4500) }
function dragEnter(event) {
  if (!event.dataTransfer?.types?.includes('Files')) return
  window.clearTimeout(dragResetTimer)
  dragDepth.value += 1
}
function dragOver(event) { if (event.dataTransfer?.types?.includes('Files')) event.dataTransfer.dropEffect = 'copy' }
function dragLeave(event) {
  if (!event.dataTransfer?.types?.includes('Files')) return
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) { dragResetTimer = window.setTimeout(() => { dragDepth.value = 0 }, 80) }
}
function dropFiles(event) {
  dragDepth.value = 0
  window.clearTimeout(dragResetTimer)
  if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files)
}
function removeContext(name) { if (activeChat.value) activeChat.value.attachments = activeChat.value.attachments.filter(file => file.name !== name) }
function removeDocument(id) { documents.value = documents.value.filter(doc => doc.id !== id); if (selectedDocument.value?.id === id) selectedDocument.value = null }
function attachLibraryDoc(doc) {
  const existing = activeChat.value?.attachments.some(item => item.name === doc.filename)
  if (!existing) activeChat.value?.attachments.push({ id: doc.id, name: doc.filename, extension: doc.type, size: 0, isImage: doc.type === 'Image' })
  selectedDocument.value = null
  section.value = 'chats'
}
function formatBytes(bytes) { if (!bytes) return 'Library source'; if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB` }
function formatDate(value) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
function onGlobalKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (section.value !== 'chats') section.value = 'chats'; nextTick(() => composerInput.value?.focus()) }
  if ((event.metaKey || event.ctrlKey) && event.key === '/') { event.preventDefault(); searchOpen.value = !searchOpen.value }
  if (event.key === 'Escape') { attachmentMenuOpen.value = false; modeMenuOpen.value = false; titleMenu.value = false; selectedDocument.value = null; mobileNavOpen.value = false; if (isStreaming.value) stopGeneration() }
}
function preventFileNavigation(event) {
  if (event.dataTransfer?.types?.includes('Files')) event.preventDefault()
}
watch(section, value => { if (value === 'library') selectedDocument.value = null })
onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('dragover', preventFileNavigation)
  window.addEventListener('drop', preventFileNavigation)
  checkBackend()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('dragover', preventFileNavigation)
  window.removeEventListener('drop', preventFileNavigation)
  activeChatRequest?.abort()
  window.clearTimeout(toastTimer)
  window.clearTimeout(dragResetTimer)
  attachments.value.forEach(item => { if (item.preview) URL.revokeObjectURL(item.preview) })
})
</script>

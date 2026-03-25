const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001

// ========= LLM 配置 =========
const LLM_CONFIG_PATH = path.join(__dirname, 'LLM_config', 'llm_config.json')
const SYSTEM_PROMPT_PATH = path.join(__dirname, 'LLM_config', 'system_prompt.json')
const READING_PROMPT_PATH = path.join(__dirname, 'LLM_config', 'tarot_reading_prompt.json')

function getLLMConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(LLM_CONFIG_PATH, 'utf-8'))
    return config.api_key && config.base_url && config.model_name ? config : null
  } catch { return null }
}

function getSystemPrompt() {
  try {
    return JSON.parse(fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8'))
  } catch { return null }
}

function getReadingPrompt() {
  try {
    return JSON.parse(fs.readFileSync(READING_PROMPT_PATH, 'utf-8'))
  } catch { return null }
}

// ========= 78 张塔罗牌数据 =========
const MAJOR_ARCANA = [
  { id: 'major_arcana_00_the_fool', name: '愚者', nameEn: 'The Fool', number: 0, type: 'major', meaningUpright: '新的开始、冒险、自由、纯真', meaningReversed: '鲁莽、冒失、不计后果' },
  { id: 'major_arcana_01_the_magician', name: '魔术师', nameEn: 'The Magician', number: 1, type: 'major', meaningUpright: '意志力、创造力、自信', meaningReversed: '操控、欺骗、才能浪费' },
  { id: 'major_arcana_02_the_high_priestess', name: '女祭司', nameEn: 'The High Priestess', number: 2, type: 'major', meaningUpright: '直觉、神秘、潜意识智慧', meaningReversed: '忽视直觉、表面化、秘密' },
  { id: 'major_arcana_03_the_empress', name: '女皇', nameEn: 'The Empress', number: 3, type: 'major', meaningUpright: '丰饶、母性、创造力、自然', meaningReversed: '过度依赖、创造力受阻' },
  { id: 'major_arcana_04_the_emperor', name: '皇帝', nameEn: 'The Emperor', number: 4, type: 'major', meaningUpright: '权威、结构、稳定、领导', meaningReversed: '专制、僵化、失控' },
  { id: 'major_arcana_05_the_hierophant', name: '教皇', nameEn: 'The Hierophant', number: 5, type: 'major', meaningUpright: '传统、信仰、指导', meaningReversed: '教条、限制、叛逆' },
  { id: 'major_arcana_06_the_lovers', name: '恋人', nameEn: 'The Lovers', number: 6, type: 'major', meaningUpright: '爱情、选择、和谐', meaningReversed: '不和谐、价值观冲突' },
  { id: 'major_arcana_07_the_chariot', name: '战车', nameEn: 'The Chariot', number: 7, type: 'major', meaningUpright: '意志力、胜利、决心', meaningReversed: '失控、缺乏方向' },
  { id: 'major_arcana_08_strength', name: '力量', nameEn: 'Strength', number: 8, type: 'major', meaningUpright: '勇气、耐心、内在力量', meaningReversed: '自我怀疑、软弱' },
  { id: 'major_arcana_09_the_hermit', name: '隐者', nameEn: 'The Hermit', number: 9, type: 'major', meaningUpright: '内省、独处、智慧', meaningReversed: '孤立、逃避' },
  { id: 'major_arcana_10_wheel_of_fortune', name: '命运之轮', nameEn: 'Wheel of Fortune', number: 10, type: 'major', meaningUpright: '命运转变、机遇、循环', meaningReversed: '抗拒改变、逆境' },
  { id: 'major_arcana_11_justice', name: '正义', nameEn: 'Justice', number: 11, type: 'major', meaningUpright: '公正、因果、真相', meaningReversed: '不公、偏见' },
  { id: 'major_arcana_12_the_hanged_man', name: '倒吊人', nameEn: 'The Hanged Man', number: 12, type: 'major', meaningUpright: '牺牲、等待、新视角', meaningReversed: '拖延、抗拒' },
  { id: 'major_arcana_13_death', name: '死神', nameEn: 'Death', number: 13, type: 'major', meaningUpright: '结束、转变、新的开始', meaningReversed: '抗拒改变、停滞' },
  { id: 'major_arcana_14_temperance', name: '节制', nameEn: 'Temperance', number: 14, type: 'major', meaningUpright: '平衡、适度、耐心', meaningReversed: '失衡、过度' },
  { id: 'major_arcana_15_the_devil', name: '恶魔', nameEn: 'The Devil', number: 15, type: 'major', meaningUpright: '束缚、欲望、物质', meaningReversed: '释放、打破束缚' },
  { id: 'major_arcana_16_the_tower', name: '塔', nameEn: 'The Tower', number: 16, type: 'major', meaningUpright: '突变、破坏、觉醒', meaningReversed: '逃避灾难、恐惧改变' },
  { id: 'major_arcana_17_the_star', name: '星星', nameEn: 'The Star', number: 17, type: 'major', meaningUpright: '希望、灵感、宁静', meaningReversed: '绝望、信心丧失' },
  { id: 'major_arcana_18_the_moon', name: '月亮', nameEn: 'The Moon', number: 18, type: 'major', meaningUpright: '幻觉、直觉、潜意识', meaningReversed: '释放恐惧、真相大白' },
  { id: 'major_arcana_19_the_sun', name: '太阳', nameEn: 'The Sun', number: 19, type: 'major', meaningUpright: '快乐、成功、活力', meaningReversed: '悲观、延迟的成功' },
  { id: 'major_arcana_20_judgement', name: '审判', nameEn: 'Judgement', number: 20, type: 'major', meaningUpright: '觉醒、重生、判决', meaningReversed: '自我怀疑、拒绝反省' },
  { id: 'major_arcana_21_the_world', name: '世界', nameEn: 'The World', number: 21, type: 'major', meaningUpright: '完成、圆满、成就', meaningReversed: '未完成、缺乏闭合' },
]

// 为了简洁，仅列出大阿卡纳完整数据。生产环境应补充56张小阿卡纳
const ALL_CARDS = [...MAJOR_ARCANA]

// ========= API 路由 =========

/** 聊天接口 - 支持 SSE 流式输出 */
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body
  const llmConfig = getLLMConfig()

  // 如果配置了 LLM，使用真实调用
  if (llmConfig) {
    try {
      const systemPrompt = getSystemPrompt()
      const response = await fetch(llmConfig.base_url + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.api_key}`
        },
        body: JSON.stringify({
          model: llmConfig.model_name,
          messages: [
            systemPrompt,
            { role: 'user', content: message }
          ],
          max_tokens: llmConfig.max_tokens,
          temperature: llmConfig.temperature,
          stream: llmConfig.stream
        })
      })

      if (llmConfig.stream) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(decoder.decode(value))
        }
        res.end()
      } else {
        const data = await response.json()
        res.json({ content: data.choices[0].message.content })
      }
      return
    } catch (err) {
      console.error('LLM call failed, falling back to mock:', err.message)
    }
  }

  // Mock 模式
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const mockResponse = '遵循宇宙的指引，我聆听到了你灵魂的呼唤。对我说"开始占卜"，让塔罗牌来为你指引方向。'
  const suggestions = ['开始占卜', '我的事业前景如何', '我的感情会有结果吗']

  for (const char of mockResponse) {
    res.write(`data: ${JSON.stringify({ content: char })}\n\n`)
    await new Promise(r => setTimeout(r, 30))
  }

  res.write(`data: ${JSON.stringify({ suggestions, done: true })}\n\n`)
  res.end()
})

/** 抽牌接口 */
app.post('/api/divination/draw', (req, res) => {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5)
  const drawn = shuffled.slice(0, 3).map(card => ({
    ...card,
    image: `/static/themes/golden_dawn/tarot/major/${card.id}.jpeg`,
    position: Math.random() > 0.5 ? 'upright' : 'reversed'
  }))
  res.json({ cards: drawn })
})

/** 历史记录 */
app.get('/api/history', (req, res) => {
  res.json({
    sessions: [
      { id: 's1', title: '昨天的运势咨询', createdAt: Date.now() - 86400000 },
      { id: 's2', title: '事业发展占卜', createdAt: Date.now() - 172800000 },
      { id: 's3', title: '情感关系解析', createdAt: Date.now() - 259200000 },
    ]
  })
})

/** 所有牌面信息 */
app.get('/api/tarot/cards', (req, res) => {
  const cards = ALL_CARDS.map(c => ({
    ...c,
    image: `/static/themes/golden_dawn/tarot/major/${c.id}.jpeg`
  }))
  res.json({ cards })
})

/** 主题列表 */
app.get('/api/themes', (req, res) => {
  res.json({
    themes: [
      { id: 'golden_dawn', name: '黄金黎明', price: 0, preview: '/static/themes/golden_dawn/preview.jpg' },
      { id: 'midnight_blue', name: '午夜蓝调', price: 1, preview: '' },
      { id: 'emerald_forest', name: '翡翠之森', price: 1, preview: '' },
    ]
  })
})

app.listen(PORT, () => {
  const config = getLLMConfig()
  console.log(`✦ AI Tarot Mock Server running on http://localhost:${PORT}`)
  console.log(`✦ LLM Mode: ${config ? 'REAL (' + config.model_name + ')' : 'MOCK (fill LLM_config/llm_config.json to enable)'}`)
})

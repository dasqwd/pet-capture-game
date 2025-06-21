// Coze API配置
const cozeConfig = {
  token: "pat_itmm8s1JXfXgxjNF7AV1cNQIL8aQGyLTGTacltjydxZpkhlCz9NowxvPLwODmffx",
  botId: "7504275160636325942",
  apiUrl: "https://api.coze.cn/open_api/v2/chat",
  userId: "user_123456"  // ✅ 补上一个唯一用户 ID（可写死测试用）
};

// 统一游戏状态对象
const gameState = {
  // 游戏流程控制
  currentStep: 'region-selection', // 其他可能值: 'pet-creation', 'main-game'
  selectedRegion: null,
  conversationId: generateConversationId(),
  
  // 宠物完整状态
  pet: {
    // 静态属性
    name: "",
    type: null,
    description: "",
    image: null,
    video: null,
    
    // 动态状态
    stats: {
      hunger: 20,     // 饥饿度（0-100%）
      health: 80,     // 生命值（0-100%）
      bond: 0,         // 历练值
      gold: 1000       // 金币（默认初始1000金币）
    },
    
    // 状态标志
    mood: "happy",    // happy/sad/excited等
    isAdventuring: false,
    lastFedTime: null,
    lastRestTime: null
  
  },
  
  // 对话系统
  messages: [],
  
  // 缓存数据
  regionPetsCache: {},
  
  // 游戏设置
  settings: {
    difficulty: "normal",
    volume: 0.8
  },

  // 提醒冷却控制（防止重复提醒）
  alertCooldown: {
    hunger: false,
    health: false
  }
};

// 状态检测配置
const STATUS_THRESHOLDS = {
  health: 20,  // 生命值≤20%时触发休息提醒
  hunger: 30,    // 饥饿度≤30%时触发喂食提醒
  // 新增冒险相关阈值
  minAdventureHealth: 60,  // 开始冒险最小生命值
  minAdventureHunger: 60,  // 开始冒险最小饥饿度
  continueAdventureHealth: 10, // 继续冒险最小生命值
  continueAdventureHunger: 0  // 继续冒险最小饥饿度
};

// 状态访问辅助函数
function getPetState() {
  return gameState.pet.stats;
}

function setPetState(newState) {
  Object.assign(gameState.pet.stats, newState);
  saveGameState();
}

// 状态保存到localStorage
function saveGameState() {
  try {
    localStorage.setItem('gameState', JSON.stringify({
      pet: gameState.pet,
      conversationId: gameState.conversationId
    }));
  } catch (e) {
    console.error("保存状态失败:", e);
  }
}

// 从localStorage加载状态
function loadGameState() {
  try {
    const saved = localStorage.getItem('gameState');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(gameState.pet, parsed.pet);
      gameState.conversationId = parsed.conversationId || generateConversationId();
    }
  } catch (e) {
    console.error("加载状态失败:", e);
  }
}

// 地域描述数据 - 提前定义
const regionData = {
    mountain: {
        name: "昆仑山脉",
        description: "冰雪覆盖的神秘山脉，栖息着冰系灵宠",
        icon: "fa-mountain"
    },
    forest: {
        name: "翡翠森林",
        description: "生机盎然的古老森林，木系灵宠的家园",
        icon: "fa-tree"
    },
    volcano: {
        name: "熔岩火山",
        description: "炽热活跃的火山地带，火系灵宠在此诞生",
        icon: "fa-fire"
    },
    ocean: {
        name: "无尽海洋",
        description: "深邃广阔的海洋世界，水系灵宠的乐园",
        icon: "fa-water"
    },
    desert: {
        name: "黄金沙漠",
        description: "炎热干燥的沙漠地带，土系灵宠的栖息地",
        icon: "fa-sun"
    },
    sky: {
        name: "天空之城",
        description: "悬浮在云端的秘境，风系灵宠在此翱翔",
        icon: "fa-cloud"
    }
};

// 生成随机会话ID
function generateConversationId() {
    return 'conv_' + Math.random().toString(36).substr(2, 9);
}

// 预加载的宠物数据
const preloadedPets = {
    mountain: [
        "霜月玉兔：毛色洁白如新雪，耳尖缀冰晶，跳跃时洒落星尘寒光。性格温柔警觉，通月华之力，能冰封与治愈。",
        "雪域狼王：通体雪白，毛发如银丝般闪亮，双眼如蓝宝石。能操控冰雪，在暴风雪中行动自如。性格孤傲但忠诚，只服从认可的主人。"
    ],
    forest: [
        "翠叶精灵：身体由嫩叶和藤蔓组成，翅膀透明如蝉翼。能促进植物生长，治愈伤病。性格温和友善，喜欢在花丛中嬉戏。",
        "橡果守卫：外形像松鼠但体型更大，毛皮呈深棕色，尾巴蓬松。脸颊能储存魔力橡果，投掷橡果作为武器。性格机警，领地意识强。"
    ],
    volcano: [
        "熔岩蜥蜴：鳞片红黑相间如冷却的熔岩，尾巴末端燃烧不熄的火焰。能在岩浆中游泳，喷吐小火球。性格活泼好动，容易兴奋。",
        "火焰凤凰雏鸟：羽毛如流动的火焰，飞行时洒落火星。鸣叫能治愈灼伤，随着成长火焰会更旺盛。性格高贵但亲近主人。"
    ],
    ocean: [
        "水晶水母：伞盖透明闪烁蓝绿光，触手飘逸如丝带。能释放治愈光波，在水中优雅漂浮。性格宁静温和，喜欢随波逐流。",
        "碧渊灵鲲：身披蓝银鳞片，背负海晶，游动间泛起光波水纹。能发音波共鸣，性情沉静亲近，是海中守护灵兽。"
    ],
    desert: [
        "金砂狐：毛发如细沙般柔软金黄，眼睛琥珀色。能在沙中穿梭，控制沙粒形成各种形状。性格机警独立，但对主人忠诚。",
        "沙漠蝎王：甲壳暗金色，毒针闪烁寒光。力量强大，耐高温，甲壳能反射阳光。性格冷静沉着，是优秀守护者。"
    ],
    sky: [
        "云朵云雀：羽毛蓬松如云，翅膀边缘有彩虹色光芒。歌声清脆，能召唤微风细雨。性格活泼开朗，喜欢高空翱翔。",
        "风暴鹰：羽毛银灰色，眼睛如闪电明亮。能操控气流，翅膀扇动产生旋风。性格高傲威严，尊重强者。"
    ]
};

// 宠物图片映射
const petBackgrounds = {
    // 地域1：昆仑山脉
    'mountain-1': '1-1-yutu.png', // 霜月玉兔
    'mountain-2': '1-2-langwang.png', // 雪域狼王
    
    // 地域2：翡翠森林
    'forest-1': '2-1-jingling.png', // 翠叶精灵
    'forest-2': '2-2-songshu.png', // 橡果守卫

    // 地域3：熔岩火山
    'volcano-1': '3-1-xiyi.png', // 熔岩蜥蜴
    'volcano-2': '3-2-fenghuang.png', // 火焰凤凰

    // 地域4：无尽海洋
    'ocean-1': '4-1-shuimu.png', // 水晶水母
    'ocean-2': '4-2-kun.png', // 碧渊灵鲲

    // 地域5：黄金沙漠
    'desert-1': '5-1-jinhu.png', // 金砂狐
    'desert-2': '5-2-xiezi.png', // 沙漠蝎王
    
    // 地域6：天空之城
    'sky-1': '6-1-que.png', // 云朵云雀
    'sky-2': '6-2-ying.png' // 风暴鹰
};

// 冒险事件类型
const adventureEvents = {
  BATTLE: {
    name: "战斗事件",
    triggers: ["遭遇野狼", "遇到哥布林", "发现敌对生物", "被怪物追击"],
    options: ["正面战斗", "背后偷袭", "暂时撤退"],
  },
  
  MERCHANT: {
    name: "神秘商人",
    triggers: ["遇到旅行商人", "发现神秘摊位", "遇见兜售物品的老者"],
    options: ["购买物品", "绕路离开"],
  },
  
  CROSSROAD: {
    name: "分岔路口",
    triggers: ["来到三岔路口", "发现多条路径", "面临方向选择"],
    options: ["走左边", "走右边", "走中间"],
  },
  
  TREASURE: {
    name: "宝箱",
    triggers: ["发现闪光的宝箱", "找到上锁的箱子", "看到埋藏的宝藏"],
    options: ["直接打开", "小心检查", "绕路离开"],
  },

  RUINS: {
    name: "神秘遗迹",
    triggers: ["迷雾笼罩的古老遗迹", "暗影笼罩的古堡", "悬浮在云端的遗迹", "直插云霄的古塔", "熔岩涌动的龙穴", "了无人烟的金字塔"],
    options: ["进入探索", "绕路离开"],
  },

  SPECIALEVENT: {
    name: "神秘任务",
    triggers: ["解救被绑架的精灵少女", "古老封印松动找到神器重新封印", "解开被诅咒的村庄", "对抗恶魔入侵", "寻找神秘宝藏"],
    options: ["接受任务", "绕路离开"],
  },

  BOSS: {
    name: "BOSS战",
    triggers: ["遭遇巨大怪物", "发现区域守卫者", "遇到传说中的生物"],
    options: ["正面战斗", "背后偷袭", "暂时撤退"],
  },

  NEXTCITY: {
    name: "新城镇",
    triggers: ["前方是新的城镇"],
    options: ["前往休息"],
  },
  
  SCENERY: {
    name: "风景线",
    triggers: ["发现壮丽瀑布", "路过神秘花海", "眺望云海奇观", "遇见彩虹桥"],
    options: ["拍照留念", "继续赶路", "积极分享"],
  }
};

// 羁绊值增加规则
function increaseBond(points) {
  gameState.pet.bond = Math.min(1000, gameState.pet.bond + points);
  
  // 羁绊值影响宠物心情
  if (gameState.pet.bond < 100) {
    gameState.pet.mood = "indifferent";
  } else if (gameState.pet.bond < 300) {
    gameState.pet.mood = "friendly";
  } else if (gameState.pet.bond < 600) {
    gameState.pet.mood = "close";
  } else {
    gameState.pet.mood = "devoted";
  }
  
  updateStatsUI();
}

// 显示指定步骤
function showStep(stepId) {
  // 1. 参数校验与默认值
  const validSteps = ['region-selection', 'pet-discovery', 'naming-pet', 'chat-interface'];
  stepId = validSteps.includes(stepId) ? stepId : 'region-selection';

  // 2. 获取目标容器
  const targetStep = document.getElementById(stepId);
  if (!targetStep) return;

  // 3. 处理所有步骤容器
  document.querySelectorAll('.step-container').forEach(container => {
    container.classList.remove('active-step');
    container.style.display = 'none';
  });

  // 4. 显示目标步骤 (聊天界面特殊处理)
  targetStep.classList.add('active-step');
  targetStep.style.display = stepId === 'chat-interface' ? 'flex' : 'block';

  // 5. 管理header显隐
  const gameHeader = document.querySelector('.game-header');
  if (gameHeader) {
    gameHeader.style.display = stepId === 'chat-interface' ? 'flex' : 'none';
  }

  // 6. 更新游戏状态
  gameState.currentStep = stepId;
  saveGameState();
}

// 配套的updateChatBackground函数（增强版）
function updateChatBackground() {
  try {
    // 1. 获取两个关键元素
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.querySelector('.chat-messages');
    // 2. 元素存在性检查
    if (!chatInterface || !chatMessages) {
      console.warn('找不到聊天界面元素');
      return;
    }

    // 3. 获取宠物类型
    const petType = gameState.pet?.type || gameState.petType;
    if (!petType) {
      console.warn('宠物类型未设置，使用默认背景');
      setBackground(chatInterface, './default-bg.jpg');
      hideMessagesBackground(chatMessages);
      return;
    }

    // 4. 获取对应背景图路径
    const bgPath = petBackgrounds[petType];
    if (!bgPath) {
      console.warn(`找不到${petType}对应的背景图`);
      return;
    }

    // 5. 设置新背景
    setBackground(chatInterface, `./pets/${bgPath}`);
    hideMessagesBackground(chatMessages);

  } catch (error) {
    console.error('更新背景出错:', error);
  }
}

// 辅助函数：设置背景样式
function setBackground(element, imageUrl) {
  element.style.backgroundImage = `url(${imageUrl})`;
  element.style.backgroundSize = 'cover';
  element.style.backgroundPosition = 'center';
  element.style.backgroundRepeat = 'no-repeat';
}

// 辅助函数：隐藏消息框背景
function hideMessagesBackground(messagesElement) {
  // messagesElement.style.backgroundImage = 'none';
  // messagesElement.style.backgroundColor = 'transparent'; // 确保透明
}

// Coze API调用
async function callCozeAPI(prompt, options = {}) {
    try {
        const requestData = {
            conversation_id: gameState.conversationId,
            bot_id: cozeConfig.botId,
            user: cozeConfig.userId,
            query: prompt,
            stream: false,
            // 新增元数据传递
            metadata: {
                pet_state: options.includePetState ? gameState.pet : null,
                action_type: options.actionType
            }
        };

        const response = await fetch(cozeConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cozeConfig.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);
        
        const data = await response.json();
        console.log("Coze 原始返回：", data);
        return processCozeResponse(data);
    } catch (error) {
        console.error("调用Coze API出错:", error);
        return formatErrorResponse(error);
    }
}

// 响应处理抽离为独立函数
function processCozeResponse(data) {
    // 1. 优先寻找无插件污染的纯文本回答
    const cleanAnswer = data.messages?.find(m => 
        m.type === 'answer' && 
        typeof m.content === 'string' &&
        !m.content.includes('plugin_id')
    )?.content || "";

    // 2. 深度清洗内容
    let finalResponse = cleanAnswer
        .replace(/{.*?}/g, '')  // 移除JSON残留
        .replace(/【.*?】/g, '') // 移除特殊标记
        .trim();

    // 3. 关键日志记录（调试用）
    console.groupCollapsed("🔍 Coze响应分析");
    console.log("原始消息列表:", data.messages);
    console.log("最终提取内容:", finalResponse);
    console.groupEnd();

    return finalResponse || generateFallbackResponse();
}


function generateFallbackResponse() {
    const fallbacks = [
        "（蹭蹭你的手）我们继续聊天吧~",
        "（耳朵转动）你刚才说什么？",
        "（尾巴轻摇）今天天气真好！"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// 错误处理标准化
function formatErrorResponse(error) {
    return `[SYSTEM_CMD]${JSON.stringify({
        error: true,
        message: error.message
    })}[/SYSTEM_CMD]网络不太稳定~`;
}

// 添加消息到聊天界面
function addMessageToChat(role, content) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
        <div class="avatar">
            <i class="fas ${role === 'system' ? 'fa-dragon' : 'fa-user'}"></i>
        </div>
        <div class="content">
            ${content}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息函数
async function sendMessage(userContent, actionType = null) {
    // 构建智能体提示词（包含状态上下文）
    const prompt = buildCozePrompt(userContent, actionType);
    
    // 显示用户消息
    displayUserMessage(userContent, actionType);
    
    // 显示加载状态
    const loadingId = showLoadingIndicator();
    
    try {
        const aiResponse = await callCozeAPI(prompt, {
            includePetState: true,
            actionType: actionType
        });
        
        document.getElementById(loadingId)?.remove();
        processAIResponse(aiResponse, actionType);
    } catch (error) {
        handleSendError(error, loadingId);
    }
}

// 提示词构建抽离
function buildCozePrompt(userContent, actionType) {
    return `[CONTEXT]
宠物名称: ${gameState.pet.name}
当前状态: 
- 饥饿度: ${gameState.pet.stats.hunger}%
- 心情: ${gameState.pet.mood}
- 生命值: ${gameState.pet.stats.health}%
行动类型: ${actionType || '普通聊天'}
[/CONTEXT]

${userContent}

[INSTRUCTIONS]
1. 根据${actionType ? '动作类型' : '问题类型'}回应
2. 必须包含1个肢体动作描述
3. ${actionType ? '描述动作效果' : '添加相关反问'}
4. 语气活泼带情感波动
5. 禁止通用回复模板
[/INSTRUCTIONS]`;
}

// 用户消息显示抽离
function displayUserMessage(content, isAction) {
    if (isAction) {
        addMessageToChat('user', content);
    } else {
        const input = document.getElementById('user-input');
        addMessageToChat('user', input.value.trim());
        input.value = '';
    }
}

// 错误处理抽离
function handleSendError(error, loadingId) {
    console.error("消息发送失败:", error);
    document.getElementById(loadingId)?.remove();
    addMessageToChat('system', `（耳朵耷拉下来）${error.message || '连接出错啦'}`);
}

// 优化后的宠物数据获取 - 使用预加载数据
async function getPetsForRegion(region) {
    // 1. 先显示预加载数据
    const pets = [...preloadedPets[region] || []];
    
    // 2. 异步尝试从Coze获取更多数据（不等待）
    fetchPetsFromCoze(region).then(additionalPets => {
        if (additionalPets.length > 0) {
            // 更新缓存供下次使用
            gameState.regionPetsCache[region] = [...pets, ...additionalPets];
        }
    }).catch(error => {
        console.error("异步获取宠物数据失败:", error);
    });
    
    return pets;
}

// 异步从Coze获取额外宠物数据
async function fetchPetsFromCoze(region) {
    try {
        const regionName = regionData[region].name;
        const prompt = `请提供3种生活在${regionName}的灵宠描述，每种用50-70字中文描述外貌和性格，直接返回数组格式，不要额外说明，例如：
["描述1", "描述2", "描述3"]`;

        const response = await fetch(cozeConfig.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cozeConfig.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                conversation_id: gameState.conversationId + '_pets_' + region,
                bot_id: cozeConfig.botId,
                user: "user_123",
                query: prompt,
                stream: false
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.messages || !data.messages[0]?.content) return [];
        
        try {
            // 安全解析JSON
            const content = data.messages[0].content;
            const parsed = JSON.parse(content.startsWith('[') ? content : `[${content}]`);
            return Array.isArray(parsed) ? parsed.filter(desc => desc.length > 20) : [];
        } catch (e) {
            console.error("解析宠物数据失败:", e);
            return [];
        }
    } catch (error) {
        console.error("获取宠物数据出错:", error);
        return [];
    }
}

// 初始化游戏
function initGame() {
  console.log("初始化游戏...");
  loadGameState();

  // 添加按钮容器事件委托
  const actionContainer = document.getElementById('action-buttons-container');
  if (actionContainer) {
    // 先移除所有现有监听器（避免重复绑定）
    actionContainer.replaceWith(actionContainer.cloneNode(true));
    // 重新绑定单一监听器
    actionContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('action-button')) {
        const buttonId = e.target.id;
        handleButtonClick(buttonId);
      }
    });
  }

  // 绑定地域选择事件
  const regionCards = document.querySelectorAll('.region-card');
  const exploreBtn = document.getElementById('explore-btn');
  
  if (regionCards.length > 0) {
    regionCards.forEach(card => {
      card.addEventListener('click', function() {
        regionCards.forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        gameState.selectedRegion = this.dataset.region;
        if (exploreBtn) exploreBtn.disabled = false;
      });
    });
  }
  
  if (exploreBtn) {
    exploreBtn.addEventListener('click', async function() {
      if (!gameState.selectedRegion) return;
      console.log("显示地图加载步骤...");

      showStep('pet-discovery');
      const regionName = regionData[gameState.selectedRegion].name;
      document.getElementById('region-name-display').textContent = regionName;
      
      // 随机选择宠物类型
      const petNum = Math.floor(Math.random() * 2) + 1;
      gameState.petType = `${gameState.selectedRegion}-${petNum}`;
      console.log('设置宠物类型:', gameState.petType); // 调试日志
      
      // 使用预加载描述
      const pets = preloadedPets[gameState.selectedRegion];
      document.getElementById('pet-description-text').textContent = pets[petNum-1];
    });
  }
  
  // 绑定捕捉按钮
  const catchBtn = document.getElementById('catch-btn');
  if (catchBtn) {
    catchBtn.addEventListener('click', function() {
      console.log('捕捉按钮被点击'); // 调试日志
    if (!gameState.petType) {  // 修改为检查petType而不是pet.type
      console.warn('未选择宠物类型');
      return;
    }
      showStep('naming-pet');
      document.getElementById('pet-name-input').value = '';
      document.getElementById('pet-name-input').focus();
    });
  }
  
  // 绑定命名确认按钮
  const nameConfirmBtn = document.getElementById('name-confirm-btn');
  if (nameConfirmBtn) {
    nameConfirmBtn.addEventListener('click', function() {
      const nameInput = document.getElementById('pet-name-input');
      const petName = nameInput.value.trim();
      
      if (petName.length < 2 || petName.length > 12) {
        alert("请输入2-12个字符的灵宠名称");
        return;
      }

    // 确保在初始化宠物状态前设置type
    const petType = gameState.petType; // 从之前的选择步骤获取

    // 初始化宠物状态（包含type）
    gameState.pet = {
      name: petName,
      type: petType, // 这里设置type
      stats: {
        hunger: 20,     // 初始饥饿值
        health: 80,     // 初始生命值
        bond: 0,         // 初始历练值
        gold: 1000     // 初始金币
      },
      mood: "happy"
    };
      
      saveGameState();
      
      // 更新UI
      updatePetNameDisplays(petName);
      document.getElementById('generating-indicator').style.display = 'block';
      
      // 进入聊天界面
      setTimeout(() => {
        gameState.currentStep = 'main-game';
        updateUI();
        updateChatBackground();
        showStep('chat-interface');
        // 新增：进入聊天界面后立即检测状态
        startAdventure()
      }, 500);
    });
  }
  
  // 绑定发送按钮
  const sendBtn = document.getElementById('send-btn');
  const userInput = document.getElementById('user-input');
  if (sendBtn && userInput) {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
      if(e.key === 'Enter') sendMessage();
    });
  }

  // 根据状态显示正确步骤
  if (gameState.pet.name) {
    console.log("检测到已有宠物，进入主游戏");
    gameState.currentStep = 'main-game';
    updateUI();
    showStep('chat-interface');
  } else {
    console.log("新玩家，显示地域选择");
    showStep('region-selection');
  }

  // 初始化状态提醒系统
  gameState.statusAlert = {
    health: false,
    hunger: false
  };
  
  // 状态检查定时器
  setInterval(checkPetStatus, 30000);
}

// 更新UI状态
function updateUI() {
  // 更新宠物名称显示 - 修复版
  if (gameState.pet.name) {
    document.querySelectorAll('#pet-name-display, .pet-name span').forEach(el => {
      el.textContent = gameState.pet.name;
    });
    
    // 更新聊天中的宠物名称
    const petNameChat = document.getElementById('pet-name-chat');
    if (petNameChat) {
      petNameChat.textContent = gameState.pet.name;
    }
  }
  
  // 更新状态栏
  updateStatsUI();
  
  // 根据当前步骤设置UI
  if (gameState.currentStep) {
    showStep(gameState.currentStep);
  }
}

// 统一更新所有名称显示
function updatePetNameDisplays(petName) {
    // 游戏标题显示
    const nameDisplays = [
        'pet-name-display',  // 顶部状态栏
        'pet-name-chat',     // 欢迎语
        'chat-title'         // 聊天标题
    ];
    
    nameDisplays.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = petName;
    });
    
    // 调试输出
    console.log('更新宠物名称:', petName, '元素:', nameDisplays.map(id => ({
        id,
        exists: !!document.getElementById(id)
    })));
}

// 更新状态显示
function updateStatsUI() {
  const stats = gameState.pet.stats;

  // 饥饿度
  const hungerBar = document.querySelector('.hunger-fill');
  const hungerText = document.querySelector('.hunger-text');
  if (hungerBar && hungerText) {
    hungerBar.style.width = `${stats.hunger}%`;
    hungerText.textContent = `${stats.hunger}%`;
  }

  // 生命值
  const healthBar = document.querySelector('.health-fill');
  const healthText = document.querySelector('.health-text');
  if (healthBar && healthText) {
    healthBar.style.width = `${stats.health}%`;
    healthText.textContent = `${stats.health}%`;
  }

  // 历练值
  const expText = document.querySelector('.exp-value');
  if (expText) {
    expText.textContent = `${stats.bond ?? 0}`;
  }

  // 金币
  const goldText = document.querySelector('.gold-value');
  if (goldText) {
    goldText.textContent = `${stats.gold ?? 0}`;
  }
}

// 格式化大数字显示
function formatExp(exp) {
    if (exp < 1000) return exp.toString();
    if (exp < 10000) return (exp/1000).toFixed(1) + 'K';
    if (exp < 1000000) return Math.floor(exp/1000) + 'K';
    if (exp < 10000000) return (exp/1000000).toFixed(1) + 'M';
    return Math.floor(exp/1000000) + 'M+';
}

// 增加历练值
function addExp(amount) {
    gameState.pet.exp = Math.min(9999999, gameState.pet.exp + amount);
    updateStatsUI();
    
    // 历练值增加时的特殊效果
    if (amount > 0) {
        flashExpBar();
    }
}

// 历练值进度条闪光效果
function flashExpBar() {
    const expFill = document.querySelector('.exp-fill');
    expFill.style.transition = 'none';
    expFill.style.boxShadow = '0 0 10px #ffeb3b';
    
    setTimeout(() => {
        expFill.style.transition = 'width 0.5s ease';
        expFill.style.boxShadow = 'none';
    }, 100);
}

// 初始化
window.addEventListener('DOMContentLoaded', initGame);

// 开始冒险检测
function startAdventure() {
  const status = checkAdventureStatus();

  if (!status.canStart) {
    if (status.critical.lowHunger) triggerPetAlert('hunger', gameState.pet.stats.hunger);
    if (status.critical.lowHealth) triggerPetAlert('health', gameState.pet.stats.health);
    return;
  }

  gameState.pet.isAdventuring = true;

  triggerRandomAdventureEvent();
}
// 结束冒险检测
function endAdventure() {
  gameState.pet.isAdventuring = false;
  sendMessage("（疲惫地趴下）我们回家休息吧...", 'adventure');
  updateActionButtons();
}

// 触发随机事件
function triggerRandomAdventureEvent() {
  const eventTypes = Object.keys(adventureEvents);
  const randomKey = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const event = adventureEvents[randomKey];

  const trigger = event.triggers[Math.floor(Math.random() * event.triggers.length)];
  const eventName = event.name || randomKey;

  // ✅ 构建自然语气的提示（口语化、拟人化）
  const prompt = `你们当前处于异世界冒险中，触发了一个事件：${eventName}，背景是：${trigger}，请你以宠物的口吻自然描述你们遇到了什么情况，然后自然引导主人选择行动和选择，但不要暴露系统字段或提示格式。`;

  // ✅ 隐性发送事件信息
  sendHiddenMessage('adventure_event', prompt, () => {
    showAdventureOptions(eventName);
  });
}

// 冒险状态检查（使用统一阈值）
function checkAdventureStatus() {
  const { health, hunger } = gameState.pet.stats;

  const result = {
    canStart: !gameState.pet.isAdventuring &&
              health > STATUS_THRESHOLDS.minAdventureHealth &&
              hunger > STATUS_THRESHOLDS.minAdventureHunger,
    canContinue: health > STATUS_THRESHOLDS.continueAdventureHealth &&
                 hunger > STATUS_THRESHOLDS.continueAdventureHunger,
    critical: {
      lowHealth: health <= STATUS_THRESHOLDS.health,
      lowHunger: hunger <= STATUS_THRESHOLDS.hunger
    }
  };

  return result;
}

// 显示冒险选项
function showAdventureOptions(eventType) {
  const container = document.getElementById('action-buttons-container');
  container.innerHTML = '';

  const optionMap = {
    "战斗事件": ["battle_attack", "battle_trick", "run_away"],
    "神秘商人": ["merchant_buy", "leave"],
    "神秘任务": ["accept_task", "leave"],
    "分岔路口": ["crossroad_left", "crossroad_middle", "crossroad_right"],
    "神秘遗迹": ["enter", "leave"],
    "宝箱": ["treasure_open", "check", "leave"],
    "BOSS战(第一阶段)": ["boss_fight", "battle_trick", "run_away"],
    "BOSS战(第二阶段)": ["boss_fight", "run_away"],
    "新城镇": ["go_rest"],
    "风景线": ["keep_memories", "move_on", "share"],
    "默认": ["continue_adventure", "rest"]
  };

  const options = optionMap[eventType] || [];

  options.forEach((optionKey, i) => {
    const config = buttonConfig[optionKey];
    if (!config) {
      console.warn(`未找到按钮配置: ${optionKey}`);
      return;
    }
    
    const button = document.createElement('button');
    button.innerHTML = config.text || optionKey;  // 支持 HTML 图标

    // ✅ 使用统一样式：主按钮格式 + 冒险样式 + 动画
    button.className = 'action-button adventure-btn button-appear';
    button.style.animationDelay = `${i * 0.1}s`;

    button.addEventListener('click', () => {
      container.innerHTML = '';
    });

    container.appendChild(button);
  });

  container.style.display = 'flex';
}

//统一的所有冒险选项
function showAdventureOptionsByKeys(keys) {
  const container = document.getElementById('action-buttons-container');
  container.innerHTML = '';

  keys.forEach(key => {
    const config = buttonConfig[key];
    if (config && (!config.condition || config.condition())) {
      const button = document.createElement('button');
      button.id = config.id;
      button.innerHTML = config.text;
      button.className = config.className;
      button.addEventListener('click', config.action);
      container.appendChild(button);
    }
  });
}

// 发送数据到Coze（增强版）
function sendToCoze(message, eventType = null) {

    // 或者选择特定字段
    const stateData = {
        hunger: gameState.pet.hunger,
        health: gameState.pet.health,
        bond: gameState.pet.bond
    };

  // 添加事件类型信息
  const fullMessage = eventType 
    ? `事件类型: ${eventType}\n${message}\n${stateString}`
    : `${message}\n${stateString}`;
  
    // 实际发送逻辑
    console.log(`发送到Coze: ${action} | 状态: ${JSON.stringify(stateData)}`);
}

// 解析Coze响应中的状态变化
function parseCozeResponse(response) {
  // 检测状态变化模式
  const statePattern = /\(状态变化：饥饿度([+-]\d+)，生命值([+-]\d+)，羁绊值([+-]\d+)\)/;
  const match = response.match(statePattern);
  
  if (match) {
    const hungerChange = parseInt(match[1]);
    const healthChange = parseInt(match[2]);
    const bondChange = parseInt(match[3]);
    
    gameState.pet.hunger = Math.max(0, Math.min(100, gameState.pet.hunger + hungerChange));
    gameState.pet.health = Math.max(0, Math.min(100, gameState.pet.health + healthChange));
    increaseBond(bondChange);
    
    updateStatsUI();
  }
  
  // 检测心情关键词
  const moodKeywords = {
    "开心": "happy",
    "兴奋": "excited",
    "悲伤": "sad",
    "害怕": "scared",
    "生气": "angry",
    "疲倦": "tired"
  };
  
  for (const [chinese, english] of Object.entries(moodKeywords)) {
    if (response.includes(chinese)) {
      gameState.pet.mood = english;
      updateMoodUI();
      break;
    }
  }
}

// 根据历练值获取心情等级
function getMoodLevel() {
    if (gameState.pet.exp < 100) return "陌生";
    if (gameState.pet.exp < 1000) return "友好";
    if (gameState.pet.exp < 5000) return "亲密";
    if (gameState.pet.exp < 20000) return "信赖";
    return "羁绊";
}

// 高羁绊值特殊互动
function checkBondSpecialActions() {
  if (gameState.pet.bond >= 600) {
    // 解锁特殊冒险选项
    document.getElementById('special-adventure').style.display = 'block';
    
    // 解锁特殊命令
    addSpecialCommand("摸摸头", () => {
      sendToCoze("用户互动：摸摸头");
      increaseBond(5);
    });
    
    addSpecialCommand("一起玩", () => {
      sendToCoze("用户互动：一起玩");
      increaseBond(10);
      gameState.pet.hunger -= 5;
      updateStatsUI();
    });
  }
}

// 添加特殊命令按钮
function addSpecialCommand(name, action) {
  const container = document.getElementById('special-actions');
  if (!container.querySelector(`[data-cmd="${name}"]`)) {
    const button = document.createElement('button');
    button.textContent = name;
    button.dataset.cmd = name;
    button.className = 'special-cmd';
    button.addEventListener('click', action);
    container.appendChild(button);
  }
}

// 检查历练值里程碑
function checkExpMilestones() {
    const milestones = [100, 1000, 5000, 20000, 100000];
    milestones.forEach(ms => {
        if (gameState.pet.exp >= ms && gameState.pet.exp - lastExp < ms) {
            sendToCoze(`系统提示：达成历练里程碑 ${formatExp(ms)}`);
        }
    });
}

// 按钮配置
const buttonConfig = {
  // 冒险按钮
  adventure: {
    id: 'adventure-btn',
    text: '<i class="fas fa-hat-wizard"></i> 开始冒险',
    className: 'action-button adventure-btn',
    condition: () => !gameState.pet.isAdventuring && 
                    gameState.pet.stats.health > 60 && 
                    gameState.pet.stats.hunger > 60,
    action: () => {
      gameState.pet.isAdventuring = true;
      // ✅ 仅在界面展示，不发送给 AI
      addMessageToChat('user', '我们出发去冒险吧！');
      // ✅ 隐性发送事件给 AI，让 AI 产生描述
      triggerRandomAdventureEvent();
      // ✅ 防止重复点击
      hideAllButtons();
    }
  },
  
  // 喂食按钮
  feed: {
    id: 'feed-btn',
    text: '<i class="fas fa-utensils"></i> 喂食',
    className: 'action-button feed-btn',
    condition: () => gameState.pet.stats.hunger < STATUS_THRESHOLDS.hunger,
    action: () => {
      sendMessage("（在背包里掏出了食物）给你吃好吃的~", 'feed');
      hideAllButtons();
    }
  },

  // 玩耍按钮
  play: {
    id: 'play-btn',
    text: '<i class="fas fa-gamepad"></i> 玩耍',
    className: 'action-button play-btn',
    condition: () => gameState.pet.stats.hunger > 50,
    action: () => {
      sendMessage("陪我一起玩玩吧！", 'play');
      hideAllButtons();
    }
  },

  // 休息按钮
  rest: {
    id: 'rest-btn',
    text: '<i class="fas fa-bed"></i> 去休息',
    className: 'action-button rest-btn',
    condition: () => gameState.pet.stats.health < STATUS_THRESHOLDS.health,
    action: () => {
      sendMessage("带宠物去附近的小镇上休息一下", 'rest');
      hideAllButtons();
    }
  },
  
  /* 继续冒险 */
  continue_adventure: {
    id: 'continue-btn',
    text: '<i class="fas fa-hat-wizard"></i> 继续冒险',
    className: 'action-button continue-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      triggerRandomAdventureEvent();
      hideAllButtons();
    }
  },

  /* 正面战斗 */
  battle_attack: {
    id: 'battle-attack',
    text: '<i class="fas fa-sword"></i> 正面战斗',
    className: 'action-button battle-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（怒吼一声）冲上去正面战斗！", 'user');
      hideAllButtons();
    }
  },
  /* 背后偷袭 */
  battle_trick: {
    id: 'battle-trick',
    text: '<i class="fas fa-user-ninja"></i> 背后偷袭',
    className: 'action-button battle-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（悄悄绕后）试试从背后偷袭...", 'user');
      hideAllButtons();
    }
  },
  /* 绕路离开 */
  leave: {
    id: 'leave-btn',
    text: '<i class="fas fa-door-open"></i> 绕路离开',
    className: 'action-button leave-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（默默的走开了）", 'user');
      hideAllButtons();
    }
  },

  /* 购买物品 */
  merchant_buy: {
    id: 'merchant-buy',
    text: '<i class="fas fa-shopping-cart"></i> 购买物品',
    className: 'action-button merchant-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（翻找金币）我想买这个！", 'user');
      hideAllButtons();
    }
  },

  /* 走左边 */
  crossroad_left: {
    id: 'crossroad-left',
    text: '<i class="fas fa-arrow-left"></i> 走左边',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（指向左边）我们走这边看看吧！", 'user');
      hideAllButtons();
    }
  },
  /* 走中间 */
  crossroad_middle: {
    id: 'crossroad-middle',
    text: '	<i class="fas fa-arrow-up"></i> 走中间',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（指向中间）我们走这边看看吧！", 'user');
      hideAllButtons();
    }
  },
  /* 走右边 */
  crossroad_right: {
    id: 'crossroad-right',
    text: '<i class="fas fa-arrow-right"></i> 走右边',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（指向右边）我们走这边看看吧！", 'user');
      hideAllButtons();
    }
  },

  /* 接受任务 */
  accept_task: {
    id: 'accept_task',
    text: '<i class="fas fa-scroll"></i> 接受任务',
    className: 'action-button treasure-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（拍了拍胸脯，眼神坚定地说）这个任务我包了！", 'user');
      hideAllButtons();
    }
  },

  /* 直接打开 */
  treasure_open: {
    id: 'treasure-open',
    text: '<i class="fas fa-box-open"></i> 直接打开',
    className: 'action-button treasure-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（迫不及待）赶快打开看看有什么！", 'user');
      hideAllButtons();
    }
  },

  /* 小心检查 */
  check: {
    id: 'check',
    text: '<i class="fas fa-search"></i> 小心检查',
    className: 'action-button check-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（眉头微微皱起，眼神专注而认真的在检查宝箱）", 'user');
      hideAllButtons();
    }
  },

  /* 进入探索 */
  enter: {
    id: 'enter',
    text: '<i class="fas fa-hat-wizard"></i> 进入探索',
    className: 'action-button enter-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（眼神兴奋地说）走，咱们去探探！", 'user');
      hideAllButtons();
    }
  },

  /* 勇敢挑战 */
  boss_fight: {
    id: 'boss-fight',
    text: '<i class="fas fa-sword"></i> 勇敢挑战',
    className: 'action-button boss-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（毛发竖起）来战斗吧！", 'user');
      hideAllButtons();
    }
  },

  /* 暂时撤退 */
  run_away: {
    id: 'run-away',
    text: '<i class="fas fa-running"></i> 暂时撤退',
    className: 'action-button leave-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（有些惊慌）快跑！", 'user');
      hideAllButtons();
    }
  },

  /* 拍照留念 */
  keep_memories: {
    id: 'keep_memories',
    text: '<i class="fas fa-camera"></i> 拍照留念',
    className: 'action-button keep_memories',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（兴奋地指着风景）合影留念一下吧~", 'user');
      hideAllButtons();
    }
  },
  /* 继续赶路 */
  move_on: {
    id: 'move_on',
    text: '<i class="fas fa-running"></i> 继续赶路',
    className: 'action-button move_on',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（指指远方）从那边走吧！", 'user');
      hideAllButtons();
    }
  },
  /* 积极分享 */
  share: {
    id: 'share',
    text: '<i class="fas fa-share-alt"></i> 积极分享',
    className: 'action-button share-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（我要分享给所有人）", 'user');
      hideAllButtons();
    }
  },
  /* 前往休息 */
  go_rest: {
    id: 'go_rest',
    text: '<i class="fas fa-bed"></i> 前往休息',
    className: 'action-button go-rest',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      sendMessage("（伸了个懒腰）终于到新城镇了，去逛逛，再休息会儿。", 'user');
      hideAllButtons();
    }
  },

};

// 应用效果函数
function applyEffects(effects) {
  if (effects.health) {
    gameState.pet.stats.health = Math.max(0, 
      Math.min(100, gameState.pet.stats.health + effects.health));
  }
  if (effects.hunger) {
    gameState.pet.stats.hunger = Math.max(0, 
      Math.min(100, gameState.pet.stats.hunger + effects.hunger));
  }
  if (effects.bond) {
    gameState.pet.stats.bond = Math.max(0, 
      gameState.pet.stats.bond + effects.bond);
  }
  
  updateUI(); // 更新UI反映状态变化
}

// 更新操作按钮
function updateActionButtons() {
  const container = document.getElementById('action-buttons-container');
  if (!container) return;

  container.innerHTML = '';

  const buttonsToShow = [];

  // 1. 优先显示状态修复按钮
  if (gameState.pet.stats.health < STATUS_THRESHOLDS.health) {
    buttonsToShow.push(buttonConfig.rest);
  }

  if (gameState.pet.stats.hunger < STATUS_THRESHOLDS.hunger) {
    buttonsToShow.push(buttonConfig.feed);
  }

  // 2. 如果没有临界状态按钮，显示其他常规按钮
  if (buttonsToShow.length === 0) {
    const candidateButtons = Object.values(buttonConfig).filter(btn =>
      btn.id !== 'rest-btn' &&
      btn.id !== 'feed-btn' &&
      btn.condition?.()
    );

    const adventureBtn = candidateButtons.find(btn => btn.id === 'adventure-btn');

    // ✅ 如果冒险按钮可显示且未提示过，则先让 AI 提议
    if (adventureBtn && !gameState._hasPromptedAdventure && !gameState.pet.isAdventuring) {
      gameState._hasPromptedAdventure = true;

      const prompt = `宠物状态良好，准备好了冒险。请以宠物语气向用户提出去冒险的建议，不要暴露系统字段。`;
      sendHiddenMessage('adventure_invite', prompt, () => {
        // 等待 AI 提示完，再显示按钮
        buttonsToShow.push(adventureBtn);
        renderActionButtons(buttonsToShow);
      });

      return; // ⛔ 停止立即渲染，等待 AI 提示完成
    }

    // 否则正常添加所有符合条件的按钮
    buttonsToShow.push(...candidateButtons);
  }

  // ✅ 渲染按钮（最多显示 3 个）
  renderActionButtons(buttonsToShow.slice(0, 3));
}


// 渲染所有按钮
function renderActionButtons(buttonList) {
  const container = document.getElementById('action-buttons-container');
  container.innerHTML = '';

  buttonList.forEach((btn, i) => {
    const button = document.createElement('button');
    button.id = btn.id;
    button.className = `${btn.className} button-appear`;
    button.innerHTML = btn.text;
    button.onclick = btn.action;
    container.appendChild(button);
    button.style.animationDelay = `${i * 0.1}s`;
  });

  container.style.display = buttonList.length > 0 ? 'flex' : 'none';
}

// 隐藏所有按钮
function hideAllButtons() {
  const container = document.getElementById('action-buttons-container');
  container.style.display = 'none';
  gameState.currentEvent = null;
}

// 处理按钮点击
function handleButtonClick(buttonId) {
  // 处理系统按钮
  if (buttonId === 'adventure-btn' && buttonConfig.adventure.condition()) {
    buttonConfig.adventure.action();
    return;
  }
  
  if (buttonId === 'feed-btn' && buttonConfig.feed.condition()) {
    buttonConfig.feed.action();
    return;
  }
  
  // 处理事件选项
  if (buttonId.startsWith('option-')) {
    const optionIndex = parseInt(buttonId.split('-')[1]);
    const button = buttonConfig.eventOption(optionIndex, '');
    if (button.condition()) {
      button.action();
    }
  }
}

// 处理事件选项
function handleEventOption() {
  const eventKeys = Object.keys(gameEvents);
  const randomKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
  triggerEvent(randomKey);
}

// 触发新事件
function triggerEvent(eventId) {
  gameState.currentEvent = eventId;
  const event = gameEvents[eventId];
  
  // 发送事件描述到Coze
  sendToCoze(`遇到事件：${event.name}`);
  
  // 更新UI显示选项按钮
  updateActionButtons();
}

// 修改定时检测函数，移除updateActionButtons调用
function checkPetStatus() {
  // 1. 状态自动衰减（保持你的设定）
  gameState.pet.stats.hunger = Math.max(0, gameState.pet.stats.hunger - 1);
  
  // 2. 总是检查临界状态（无论是否触发提醒都更新按钮）
  checkCriticalStatus(); 
  
  updateStatsUI();
}

// 综合状态检测
function checkCriticalStatus() {
  console.log("[checkCriticalStatus] 检查状态触发逻辑中...");
  const { health, hunger } = gameState.pet.stats;

  console.log("当前生命值:", health, "当前饥饿度:", hunger);

  let triggered = false;

  // 生命值检测（带冷却控制）
  if (health <= STATUS_THRESHOLDS.health) {
    if (!gameState.alertCooldown.health) {
      console.log("⚠️ 生命值过低，触发提醒！");
      triggerPetAlert('health', health);
      gameState.alertCooldown.health = true;

      // 设置5分钟冷却
      setTimeout(() => {
        gameState.alertCooldown.health = false;
        console.log("✅ 生命值提醒冷却结束");
      }, 5 * 60 * 1000);
    }

    triggered = true;

    if (gameState.pet.isAdventuring && health <= STATUS_THRESHOLDS.continueAdventureHealth) {
      console.log("🛑 生命值严重过低，强制结束冒险");
      endAdventure();
    }
  }

  // 饥饿度检测（带冷却控制）
  if (hunger <= STATUS_THRESHOLDS.hunger) {
    if (!gameState.alertCooldown.hunger) {
      console.log("⚠️ 饥饿度过低，触发提醒！");
      triggerPetAlert('hunger', hunger);
      gameState.alertCooldown.hunger = true;

      // 设置5分钟冷却
      setTimeout(() => {
        gameState.alertCooldown.hunger = false;
        console.log("✅ 饥饿提醒冷却结束");
      }, 5 * 60 * 1000);
    }

    triggered = true;

    if (gameState.pet.isAdventuring && hunger <= STATUS_THRESHOLDS.continueAdventureHunger) {
      console.log("🛑 饥饿度严重过低，强制结束冒险");
      endAdventure();
    }
  }

  return triggered;
}


// 触发宠物提醒
function triggerPetAlert(type, currentValue) {
  const messages = {
    health: [
      `（虚弱地趴着）主人...我的生命值只剩${currentValue}%了，能带我去小镇休息吗？`,
      `（走路摇摇晃晃）我感觉好累...生命值只有${currentValue}%了...`
    ],
    hunger: [
      `（肚子咕咕叫）我已经饿得没力气了...饥饿度只剩${currentValue}%了...`,
      `（咬着你的衣角）能不能给我点吃的？饥饿度只有${currentValue}%了...`
    ]
  };

  if (!messages[type]) {
    console.warn(`未知提醒类型: ${type}`);
    return;
  }

  const message = messages[type][Math.floor(Math.random() * messages[type].length)];

  sendHiddenMessage(type, message, () => {
    updateActionButtons();
  });
}

// 隐性消息发送（玩家不可见）
function sendHiddenMessage(type, content, callback) {
  const loadingId = `loading-${type}`;

  // ✅ 显示加载动画
  showLoadingIndicator(loadingId);

  const currentValue = gameState.pet?.stats?.[type] ?? '-';
  const prompt = `[SYSTEM_ALERT]类型:${type},当前值:${currentValue}[/SYSTEM_ALERT]${content}`;

  // ✅ 打印日志（便于调试）
  console.log(`[sendHiddenMessage] 准备发送系统提示:`);
  console.log("类型:", type);
  console.log("当前值:", currentValue);
  console.log("发送内容:", prompt);

  callCozeAPI(prompt).then(response => {
    // ✅ 隐藏加载动画
    hideLoadingIndicator(loadingId);

    console.log(`[sendHiddenMessage] Coze返回原始响应:`, response);

    const cleanResponse = response.replace(/\[.*?\]/g, '');
    console.log(`[sendHiddenMessage] 清洗后内容:`, cleanResponse);

    showPetAlert(cleanResponse, type);

    if (callback) callback();

  }).catch(err => {
    hideLoadingIndicator(loadingId);
    console.error("[sendHiddenMessage] 调用失败：", err);
  });
}


// 显示宠物提醒
function showPetAlert(message, alertType) {
  const alert = document.createElement('div');
  alert.className = `message system`; // 使用system类而不是system-alert
  alert.innerHTML = `
    <div class="avatar">
      <i class="fas fa-dragon"></i> <!-- 使用宠物头像 -->
    </div>
    <div class="content">${message}</div>
  `;
  
  document.getElementById('messages').appendChild(alert);
  alert.scrollIntoView({ behavior: 'smooth' });
}

//AI响应处理
function processAIResponse(response, actionType = null) {
    // 1. 响应内容清洗（增强版）
    let cleanResponse = cleanCozeResponse(response);
    
    // 2. 状态变更处理
    if (actionType) {
        const changes = calculateChanges(actionType, cleanResponse);
        applyStatusChanges(changes, cleanResponse);  // ✅ 已自动触发后续检查
        return;
    }

    // 3. 普通消息显示
    displayPetResponse(cleanResponse);
}

// 替换原来的updatePetStats调用
function updatePetStats(changes) {
    // 确保gameState存在
    if (!gameState.pet) {
        console.error("游戏状态未初始化");
        return;
    }

    // 更新数值（带安全校验）
    const stats = gameState.pet.stats;
    if (changes.hunger) {
        stats.hunger = Math.min(100, Math.max(0, stats.hunger + changes.hunger));
    }
    if (changes.mood) {
        gameState.pet.mood = Math.min(100, Math.max(0, (gameState.pet.mood || 50) + changes.mood));
    }

    // 更新UI显示
    updateStatsUI();
    
    // 调试日志
    console.log("状态更新：", {
        hunger: stats.hunger,
        mood: gameState.pet.mood
    });
}

// ========== 工具函数 ==========
function cleanCozeResponse(response) {
    if (!response) return "（歪着头看你）";

    let cleaned = String(response)
        // 移除系统标记、花括号、方括号内容
        .replace(/\[SYSTEM_.*?\]/g, '')
        .replace(/{.*?}/g, '')
        .replace(/【.*?】/g, '')
        
        // 清理多余空格/空行
        .replace(/\n{2,}/g, '\n')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return cleaned || "（歪着头看你）";
}

function calculateChanges(actionType, response) {
    const baseChanges = getRandomStatChange(actionType);
    
    // 动态调整策略
    if (response.includes('开心')) baseChanges.mood += 5;
    if (response.includes('饿')) baseChanges.hunger -= 3;
    
    // 从AI回复中提取数值（如 [HUNGER+20]）
    const hungerMatch = response.match(/HUNGER([+-]\d+)/);
    if (hungerMatch) baseChanges.hunger = parseInt(hungerMatch[1]);
    
    return baseChanges;
}

function applyStatusChanges(changes, response) {
    // 更新状态
    updatePetStats(changes);

    // 构建状态变化信息
    const statusMsg = buildStatusMessage(changes);
    
    // 构建显示内容：原文 + 状态变化（换行）
    const displayText = response.replace(/\[.*?\]/g, '').trim();
    
    // 使用 <br> 实现换行（HTML 环境中比 \n 更安全）
    const finalText = statusMsg ? `${displayText}<br><br>${statusMsg}` : displayText;

    // 显示整合后的消息
    addMessageToChat('system', finalText || "（轻轻蹭了蹭你）");
    // ✅ 状态更新后触发关键事件判断
    checkCriticalStatus();
    // 这会自动判断是否向 AI 提议冒险
    updateActionButtons();  
}

function buildStatusMessage(changes) {
    const parts = [];
    if (changes.hunger) parts.push(`饥饿度${changes.hunger > 0 ? '+' : ''}${changes.hunger}`);
    if (changes.mood) parts.push(`心情${changes.mood > 0 ? '+' : ''}${changes.mood}`);
    return parts.length ? `（状态变化：${parts.join('，')}）` : null;
}

function displayPetResponse(response) {
    // 过滤残留指令标记
    const finalText = response.replace(/\[.*?\]/g, '').trim();
    addMessageToChat('system', finalText || "（轻轻蹭了蹭你）");
}

// 显示加载动画...
function showLoadingIndicator(id) {
    const messagesContainer = document.getElementById('messages');
    const loadingMessage = document.createElement('div');
    loadingMessage.id = id;
    loadingMessage.className = 'message system';
    loadingMessage.innerHTML = `
        <div class="avatar">
            <i class="fas fa-dragon"></i>
        </div>
        <div class="content">
            <div class="loading-dots">
                <span>.</span><span>.</span><span>.</span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
// 隐藏加载动画...
function hideLoadingIndicator(id) {
  const loadingEl = document.getElementById(id);
  if (loadingEl) loadingEl.remove();
}

// 随机状态计算函数（可复用）
function getRandomStatChange(actionType) {
  // 基础行为配置（原有逻辑）
  const BASE_BEHAVIORS = {
    feed: { 
      //hunger: [15, 35],  // 喂食随机恢复15-35点
      hunger: [70, 80],  // 喂食随机恢复15-35点
      gold: [-2, -2],  // 扣除金币
      //mood: [5, 15]       // 心情提升5-15点

    },
    play: { 
      hunger: [-20, -5],  // 玩耍消耗5-20点
      //mood: [10, 20]      // 心情提升10-20点
    }, 
    rest: { 
      health: [35, 80],   // 休息恢复35-80点
      gold: [-20, -20],  // 扣除金币
      //mood: [10, 20]      // 心情提升10-20点
    }
  };

  // 冒险事件配置（新增逻辑）
  const ADVENTURE_ACTIONS = {
    // 通用冒险消耗（所有冒险行为都会应用）
    _base: {
      hunger: [-5, -1], 
    },
    
    // 战斗类-正面战斗
    battle_attack: {
      hunger: [-5, -1],
      health: [-10, -1],
      gold: [1, 10],
      bond: [1, 5]
    },

    // 战斗类-偷袭
    battle_trick: {
      hunger: [-10, -5], 
      health: [-5, 0],
      gold: [1, 10],
      bond: [1, 5]
    },

    // 战斗类-BOSS战
    boss_fight: {
      hunger: [-10, -5], 
      health: [-20, -5],
      gold: [10, 20],
      bond: [10, 20]
    },

    // 购买商品
    merchant_buy: {
      gold: [-12, -5],
      health: [20, 50],   // 购买治疗物品
    },

    // 宝箱类-直接打开
    treasure_open: {
      gold: [5, 15],
      health: [-10, 10],   
      hunger: [-10, 20],   
    },
    // 宝箱类-小心检查
    treasure_open: {
      gold: [10, 20],  
      hunger: [-15, 15],   
    },

    // 向左
    crossroad_left: {
      health: [-10, 10],  // 可能受伤或发现恢复点
    },

    // 向中间
    crossroad_middle: {
      health: [-10, 10],  // 可能受伤或发现恢复点
    },

    // 向右
    crossroad_right: {
      health: [-10, 10],  // 可能受伤或发现恢复点
    },

    // 拍照留念
    keep_memories: {
      bond: [20, 50]
    },

    // 积极分享
    share: {
      gold: [100, 200],  
    },

    // 默认冒险行为
    default: {
      bond: [1, 5]       // 基础羁绊增长
    }
  };

  // 判断行为类型
  if (BASE_BEHAVIORS[actionType]) {
    // 处理基础行为（喂食/玩耍/休息）
    const ranges = BASE_BEHAVIORS[actionType];
    return {
      hunger: getRandomInRange(...(ranges.hunger || [0, 0])),
      health: getRandomInRange(...(ranges.health || [0, 0])),
      gold: getRandomInRange(...(ranges.gold || [0, 0])),
      //mood: getRandomInRange(...(ranges.mood || [0, 0])),
      bond: 0 // 基础行为不加羁绊值
    };
  } 
  else {
    // 处理冒险行为
    const actionConfig = ADVENTURE_ACTIONS[actionType] || ADVENTURE_ACTIONS.default;
    
    // 合并基础消耗和特定行为效果
    return {
      hunger: getRandomInRange(...ADVENTURE_ACTIONS._base.hunger) + 
            getRandomInRange(...(actionConfig.hunger || [0, 0])),
      health: getRandomInRange(...(actionConfig.health || [0, 0])),
      gold: getRandomInRange(...(actionConfig.gold || [0, 0])),
      bond: getRandomInRange(...(actionConfig.bond || [0, 0])),
      mood: 0 // 冒险行为不直接影响心情
    };
  }
}

// 辅助函数：生成区间随机数
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

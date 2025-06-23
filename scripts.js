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

  // BOSS 战状态
  bossBattle: {
    isFighting: false,
    totalRounds: 0,
    currentRound: 0,
    rewardMultiplier: 1.0, // 根据回合数决定
    bossName: ""
  },

  // 神秘任务状态
  mysteryTask: {
    isAccepted: false,
    requiredRounds: 0,
    currentRounds: 0
  },

  // 探索遗迹状态
  ruinsExploration: {
    isExploring: false,
    currentRound: 0,
    totalRounds: 0,
    rewardMultiplier: 1.0
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
  minAdventureHealth: 30,  // 开始冒险最小生命值
  minAdventureHunger: 20,  // 开始冒险最小饥饿度
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
      
      // 强制重置冒险状态
      if (parsed.pet) {
        gameState.pet = parsed.pet;
        gameState.pet.isAdventuring = false;
        gameState.pet.lastFedTime = null; // 可选：同时重置其他计时器
      }
      // ✅ 加载完毕后立即刷新背景
      updateChatBackground();
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
    options: ["勇敢挑战", "暂时撤退"],
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
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatInterface || !chatMessages) {
      console.warn('❌ 找不到聊天界面元素');
      return;
    }

    const petType = gameState.pet?.type || gameState.petType;
    console.log('[背景更新] 当前宠物类型:', petType);

    if (!petType) {
      console.warn('❌ 宠物类型未设置，使用默认背景');
      setBackground(chatInterface, './default-bg.jpg');
      hideMessagesBackground(chatMessages);
      return;
    }

    const bgPath = petBackgrounds[petType];
    if (!bgPath) {
      console.warn(`❌ 未找到 ${petType} 对应的背景图`);
      return;
    }

    const imagePath = `./pets/${bgPath}`;
    console.log('[背景更新] 图片路径:', imagePath);

    const videoPath = imagePath.replace('.png', '-mv.mp4');
    console.log('[背景更新] 视频路径:', videoPath);

    // 设置背景图片作为初始显示
    chatInterface.style.backgroundImage = `url("${imagePath}")`;

    // 创建视频元素
    const video = document.createElement('video');
    video.src = videoPath;
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true; // 防止移动端全屏
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.zIndex = '-1';
    video.style.pointerEvents = 'none';
    video.style.opacity = '0';
    video.id = 'bg-video';

    console.log('[背景更新] 开始加载视频...');

    video.onloadeddata = () => {
      console.log('✅ 视频加载完成，插入 DOM');
      // 删除旧视频（如果存在）
      const oldVideo = document.getElementById('bg-video');
      if (oldVideo) oldVideo.remove();

      // 插入新视频
      chatInterface.appendChild(video);
      // 渐现
      setTimeout(() => {
        video.style.opacity = '1';
      }, 100);
    };

    video.onerror = (e) => {
      console.warn('⚠️ 视频加载失败:', videoPath);
    };

  } catch (err) {
    console.error('❌ 更新背景出错:', err);
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
1. 请根据用户的问题进行主要答复
2. 根据${actionType ? '动作类型' : '问题类型'}回应
3. 必须包含1个肢体动作描述
4. ${actionType ? '描述动作效果' : '添加相关反问'}
5. 语气活泼带情感波动
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
        updateActionButtons(); // ✅ 让按钮显示而不是立即冒险
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
    updateActionButtons();  // ✅ 补充，确保按钮显示
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

// 初始化
window.addEventListener('DOMContentLoaded', initGame);

// 开始冒险检测
function startAdventure() {
  const { health, hunger } = gameState.pet.stats;
  
  // 生命值不足
  if (health <= STATUS_THRESHOLDS.minAdventureHealth) {
    triggerPetAlert('health', health); // 使用原有的提醒系统
    return;
  }
  
  // 饥饿度不足
  if (hunger <= STATUS_THRESHOLDS.minAdventureHunger) {
    triggerPetAlert('hunger', hunger);
    return;
  }

  // 状态正常时开始冒险
  gameState.pet.isAdventuring = true;
  triggerRandomAdventureEvent();
  
  sendMessage("（兴奋地跳起来）我们出发去冒险吧！", 'system');
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

  // ========================
  // 🎯 BOSS 战处理
  // ========================
  if (gameState.bossBattle?.isFighting) {
    const round = gameState.bossBattle.currentRound;
    const total = gameState.bossBattle.totalRounds;
    const bossName = gameState.bossBattle.bossName;
    
    const prompt = `这是与 ${bossName} 的第 ${round} 回合战斗。`;
    
    if (round >= total) {
      // 最后一回合
      const gold = Math.floor(getRandomInRange(20, 50) * gameState.bossBattle.rewardMultiplier);
      const bond = Math.floor(getRandomInRange(10, 20) * gameState.bossBattle.rewardMultiplier);
      
      prompt += `\n玩家成功击败了 ${bossName}！奖励金币：${gold}，历练值：${bond}。请用宠物语气描述胜利场景。`;
    } else {
      prompt += `请描述当前战斗场面，并说明 BOSS 是否显露出疲态。`;
    }
    
    sendHiddenMessage('boss_battle', prompt, (aiResponse) => {
      applyStatusChanges({}, aiResponse);
      if (round >= total) {
        gameState.bossBattle.isFighting = false;
        showAdventureOptionsByKeys(['continue_adventure', 'rest']);
      } else {
        showAdventureOptionsByKeys(['boss_fight', 'battle_trick', 'run_away']);
      }
    });
    return;
  }

  // ========================
  // 🔁 神秘任务处理
  // ========================
  if (gameState.mysteryTask?.isAccepted) {
    gameState.mysteryTask.currentRounds = (gameState.mysteryTask.currentRounds || 0) + 1;
    console.log(`神秘任务进行中：第 ${gameState.mysteryTask.currentRounds}/${gameState.mysteryTask.requiredRounds} 回合`);

    if (gameState.mysteryTask.currentRounds >= gameState.mysteryTask.requiredRounds) {
      handleMysteryTaskComplete();
      return;
    }
  }

  // ========================
  // 🏰 遗迹探索处理
  // ========================
  if (gameState.ruinsExploration?.isExploring) {
    triggerRuinsEvent(); // 将遗迹事件处理交给专门的函数
    return;
  }

  // ========================
  // ✨ 普通冒险事件处理
  // ========================
  const availableEvents = getAvailableAdventureEvents();
  const randomKey = availableEvents[Math.floor(Math.random() * availableEvents.length)];
  const event = adventureEvents[randomKey];
  
  const trigger = event.triggers[Math.floor(Math.random() * event.triggers.length)];
  const eventName = event.name;

  const prompt = `冒险中遇到了【${eventName}】：${trigger}。请用宠物语气描述并询问该怎么办。不要出现事件描述的字样，也不要暴露任何系统字段或后台设定。`;
  
  sendHiddenMessage('adventure_event', prompt, (aiResponse) => {
    applyStatusChanges({}, aiResponse);
    showAdventureOptions(eventName);
  });
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
    "BOSS战": ["boss_fight", "run_away"],
    "新城镇": ["go_rest", "continue_adventure"],
    "风景线": ["keep_memories", "move_on", "share"],
    "默认": ["continue_adventure", "rest"]
  };

  const options = optionMap[eventType] || optionMap["默认"];

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

    // ✅ 正确绑定逻辑
    button.addEventListener('click', () => {
      console.log(`点击了冒险选项: ${optionKey}`);
      config.action();  // 执行原本定义的逻辑（包括 sendMessage）
      container.innerHTML = '';
    });

    container.appendChild(button);
  });

  container.style.display = 'flex';
}

//统一的所有冒险选项
function showAdventureOptionsByKeys(keys) {
  const container = document.getElementById('action-buttons-container');
  if (!container) {
    console.error('按钮容器不存在');
    return;
  }
  
  container.innerHTML = '';
  
  // 过滤出可用的按钮配置
  const availableButtons = keys
    .map(key => buttonConfig[key])
    .filter(config => config && (!config.condition || config.condition()));
  
  if (availableButtons.length === 0) {
    console.warn('没有可用的按钮配置');
    container.style.display = 'none';
    return;
  }
  
  // 创建并添加按钮
  availableButtons.forEach((config, index) => {
    const button = document.createElement('button');
    button.id = config.id;
    button.innerHTML = config.text;
    button.className = `${config.className} button-appear`;
    button.style.animationDelay = `${index * 0.1}s`;
    button.addEventListener('click', config.action);
    container.appendChild(button);
  });
  
  // 确保容器可见
  container.style.display = 'flex';
  console.log('显示按钮:', keys);
}

// 按钮配置
const buttonConfig = {
  // 冒险按钮
  adventure: {
    id: 'adventure-btn',
    text: '<i class="fas fa-hat-wizard"></i> 开始冒险',
    className: 'action-button adventure-btn',
    condition: () => !gameState.pet.isAdventuring, // 只要不在冒险中就显示
    action: () => {
      // 检查状态
      const { health, hunger } = gameState.pet.stats;
      
      // 生命值不足
      if (health <= STATUS_THRESHOLDS.minAdventureHealth) {
        addMessageToChat('system' , `（虚弱地趴着）生命值只剩${health}%了，让我休息一下再来冒险吧~`);
        return;
      }
      
      // 饥饿度不足
      if (hunger <= STATUS_THRESHOLDS.minAdventureHunger) {
        addMessageToChat('system', `（肚子咕咕叫）饥饿度只剩${hunger}%了，先喂喂我吧...`);
        return;
      }
      
      // 状态正常，开始冒险
      gameState.pet.isAdventuring = true;
      addMessageToChat('user', '我们出发去冒险吧！');
      triggerRandomAdventureEvent();
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
      sendMessage("（掏出食物）给你吃好吃的~", 'feed');
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
    action: () => handleAdventureAction('battle_attack', '（怒吼一声）冲上去正面战斗！')
  },
  /* 背后偷袭 */
  battle_trick: {
    id: 'battle-trick',
    text: '<i class="fas fa-user-ninja"></i> 背后偷袭',
    className: 'action-button battle-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('battle_trick', '（悄悄绕后）试试从背后偷袭...')
  },
  /* 绕路离开 */
  leave: {
    id: 'leave-btn',
    text: '<i class="fas fa-door-open"></i> 绕路离开',
    className: 'action-button leave-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('leave', '（默默的走开了）')
  },

  /* 购买物品 */
  merchant_buy: {
    id: 'merchant-buy',
    text: '<i class="fas fa-shopping-cart"></i> 购买物品',
    className: 'action-button merchant-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('merchant_buy', '（翻找金币）我想买这个！')
  },

  /* 走左边 */
  crossroad_left: {
    id: 'crossroad-left',
    text: '<i class="fas fa-arrow-left"></i> 走左边',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('crossroad_left', '（指向左边）我们走这边看看吧！')
  },
  /* 走中间 */
  crossroad_middle: {
    id: 'crossroad-middle',
    text: '	<i class="fas fa-arrow-up"></i> 走中间',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('crossroad_middle', '（指向中间）我们走这边看看吧！')
  },
  /* 走右边 */
  crossroad_right: {
    id: 'crossroad-right',
    text: '<i class="fas fa-arrow-right"></i> 走右边',
    className: 'action-button crossroad-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('crossroad_right', '（指向右边）我们走这边看看吧！')
  },

  /* 接受任务 */
  accept_task: {
    id: 'accept_task',
    text: '<i class="fas fa-scroll"></i> 接受任务',
    className: 'action-button treasure-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      // ✅ 初始化任务状态，随机神秘任务次数
      const rounds = getRandomInRange(5, 12);
      gameState.mysteryTask.isAccepted = true;
      gameState.mysteryTask.requiredRounds = rounds;
      gameState.mysteryTask.currentRounds = 0;

      addMessageToChat('user',"（郑重点头）任务我接下了，出发吧！");
      
      // ✅ 提示任务已接受
      addMessageToChat('system', `（坚定地看着你）任务已接下，咱们现在就出发前往目标地点吧！`);
      // ✅ 进入下一次冒险
      triggerRandomAdventureEvent();
      hideAllButtons();
    }
  },

  /* 直接打开 */
  treasure_open: {
    id: 'treasure-open',
    text: '<i class="fas fa-box-open"></i> 直接打开',
    className: 'action-button treasure-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('treasure_open', '（迫不及待）赶快打开看看有什么！')
  },

  /* 小心检查 */
  check: {
    id: 'check',
    text: '<i class="fas fa-search"></i> 小心检查',
    className: 'action-button check-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('check', '（眉头微微皱起，眼神专注而认真的在检查宝箱）')
  },

  /* 进入探索 */
  enter: {
    id: 'enter',
    text: '<i class="fas fa-hat-wizard"></i> 进入探索',
    className: 'action-button enter-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
    triggerRuinsEvent(); // ✅ 仅处理神秘遗迹探索
  }
  },

  /* 勇敢挑战 */
  boss_fight: {
    id: 'boss-fight',
    text: '<i class="fas fa-sword"></i> 勇敢挑战',
    className: 'action-button boss-option',
    condition: () => gameState.pet.isAdventuring,
    action: () => {
      const userText = "（怒吼一声）冲上去正面战斗！";
      addMessageToChat('user', userText);

      // 使用 let 而不是 const，因为后面会修改
      let result = {
        health: getRandomInRange(-20, -5),
        hunger: getRandomInRange(-5, 0),
        gold: 0,
        bond: 0
      };

      // 使用 let 而不是 const
      let prompt = `这是与 ${gameState.bossBattle.bossName} 的第 ${gameState.bossBattle.currentRound} 回合战斗。
        玩家选择了正面战斗，损失 ${-result.health} 点生命，消耗 ${-result.hunger} 点体力。
        请用宠物语气描述当前战斗场面，并说明 BOSS 是否显露出疲态。最后询问主人该怎么办。不要暴露任何系统字段或后台设定。`;

      // 如果是最后一回合，添加胜利奖励
      if (gameState.bossBattle.currentRound >= gameState.bossBattle.totalRounds) {
        const gold = Math.floor(getRandomInRange(20, 50) * gameState.bossBattle.rewardMultiplier);
        const bond = Math.floor(getRandomInRange(10, 20) * gameState.bossBattle.rewardMultiplier);
        result = {  // 这里会修改 result 对象
                ...result, // 保留原有属性
                gold: gold,
                bond: bond
              };

        prompt += `\n\n玩家成功击败了 ${gameState.bossBattle.bossName}！
          奖励金币：${gold}，历练值：${bond}。
          请用宠物语气描述胜利场景，并感谢玩家的英勇。`;
      }

      sendHiddenMessage('boss_battle', prompt, (aiResponse) => {
        applyStatusChanges(result, aiResponse);
        
        if (gameState.bossBattle.currentRound >= gameState.bossBattle.totalRounds) {
          gameState.bossBattle.isFighting = false;
          showAdventureOptionsByKeys(['continue_adventure', 'rest']);
        } else {
          gameState.bossBattle.currentRound++;
          showAdventureOptionsByKeys(['boss_fight', 'battle_trick', 'run_away']);
        }
      });

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
        sendMessage("（我们快逃！）", 'user');
        
        const prompt = `玩家在第 ${gameState.bossBattle.currentRound} 回合中选择了逃跑，终止了与 ${gameState.bossBattle.bossName} 的战斗。
      请描述他们仓皇逃跑的情景，并建议稍作休整后再冒险。`;

        sendHiddenMessage('boss_escape', prompt, (aiResponse) => {
          applyStatusChanges({}, aiResponse);
          gameState.bossBattle.isFighting = false;
          showAdventureOptionsByKeys(['continue_adventure', 'rest']);
        });

        hideAllButtons();
    }
  },

  /* 拍照留念 */
  keep_memories: {
    id: 'keep_memories',
    text: '<i class="fas fa-camera"></i> 拍照留念',
    className: 'action-button keep_memories',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('keep_memories', '（兴奋地指着风景）合影留念一下吧~')
  },
  /* 继续赶路 */
  move_on: {
    id: 'move_on',
    text: '<i class="fas fa-running"></i> 继续赶路',
    className: 'action-button move_on',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('move_on', '（指指远方）从那边走吧！')
  },
  /* 积极分享 */
  share: {
    id: 'share',
    text: '<i class="fas fa-share-alt"></i> 积极分享',
    className: 'action-button share-btn',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('share', '（我要分享给所有人）')
  },
  /* 前往休息 */
  go_rest: {
    id: 'go_rest',
    text: '<i class="fas fa-bed"></i> 前往休息',
    className: 'action-button go-rest',
    condition: () => gameState.pet.isAdventuring,
    action: () => handleAdventureAction('go_rest', '（伸了个懒腰）终于到新城镇了，去逛逛，再休息会儿。')
  },

};

// ✅ 冒险按钮点击应用（结果处理 + UI更新 + 状态反馈）
function handleAdventureAction(actionType, userText) {
  console.log(`🔵[handleAdventureAction] 玩家选择了冒险行为: ${actionType}`);
  
  // ① 玩家发言
  addMessageToChat('user', userText);

  // ② 计算属性变化
  const result = getRandomStatChange(actionType);
  
  // ③ 构造prompt
  const prompt = `玩家选择了 ${actionType}，消耗了体力，获得了奖励。请用宠物语气描述过程和感受，不需要列出数值变化。`;
  
  // ④ 发送prompt
  sendHiddenMessage('adventure_result', prompt, (aiResponse) => {
    applyStatusChanges(result, aiResponse);
    
    // 根据当前事件类型决定显示什么按钮
    if (gameState.bossBattle.isFighting) {
      // BOSS战特殊处理
      if (gameState.bossBattle.currentRound >= gameState.bossBattle.totalRounds) {
        showAdventureOptionsByKeys(['continue_adventure', 'rest']);
      } else {
        showAdventureOptionsByKeys(['boss_fight', 'battle_trick', 'run_away']);
      }
    } else {
      // 其他事件回到继续冒险
      showAdventureOptionsByKeys(['continue_adventure', 'rest']);
    }
  });

  hideAllButtons();
}

//神秘任务完成函数
function handleMysteryTaskComplete() {
  const times = gameState.mysteryTask.requiredRounds;
  const baseGold = getRandomInRange(30, 80);
  const baseBond = getRandomInRange(5, 10);

  const finalGold = Math.floor(baseGold * times);
  const finalBond = Math.floor(baseBond * times);

  // ✅ 清除任务状态
  gameState.mysteryTask = {
    isAccepted: false,
    requiredRounds: 0,
    currentRounds: 0
  };

  // ✅ 状态变化应用
  const reward = {
    gold: finalGold,
    bond: finalBond,
    hunger: 0,
    health: 0
  };

  // ✅ 状态更新
  applyStatusChanges(reward, `恭喜你完成了本次的神秘任务，获得了 ${finalGold} 金币与 ${finalBond} 成就点！`);
}

// 更新操作按钮
function updateActionButtons() {
  const container = document.getElementById('action-buttons-container');
  if (!container) {
    console.warn('按钮容器不存在');
    return;
  }
  
  container.innerHTML = '';
  const buttonsToShow = [];
  
  // 1. 优先显示状态提醒按钮
  if (gameState.pet.stats.health < STATUS_THRESHOLDS.health) {
    buttonsToShow.push(buttonConfig.rest);
  }
  if (gameState.pet.stats.hunger < STATUS_THRESHOLDS.hunger) {
    buttonsToShow.push(buttonConfig.feed);
  }

  // 2. 添加开始冒险按钮（如果满足条件且不在冒险中）
  if (!gameState.pet.isAdventuring && 
      gameState.pet.stats.health > STATUS_THRESHOLDS.minAdventureHealth &&
      gameState.pet.stats.hunger > STATUS_THRESHOLDS.minAdventureHunger) {
    buttonsToShow.push(buttonConfig.adventure);
  }

  // 3. 添加其他可用按钮（去重）
  const addedIds = new Set(buttonsToShow.map(b => b.id));
  Object.values(buttonConfig).forEach(btn => {
    if (!addedIds.has(btn.id) && btn.condition?.()) {
      buttonsToShow.push(btn);
    }
  });

  // 渲染按钮（最多4个）
  renderActionButtons(buttonsToShow.slice(0, 4));
}

// 触发神秘遗迹中的冒险事件
function triggerRuinsEvent() {
  const { currentRound, totalRounds } = gameState.ruinsExploration;

  gameState.ruinsExploration.currentRound++;
  const roundNow = gameState.ruinsExploration.currentRound;

  // ✅ 最后一回合为宝箱事件
  if (roundNow === totalRounds) {
    triggerFixedEvent('宝箱');
    return;
  }

  // ✅ 遗迹期间的事件池（权重调整）
  const weightedEvents = [
    { key: '战斗事件', weight: 4 },
    { key: '分岔路口', weight: 4 },
    { key: '宝箱', weight: 1 },
    { key: 'BOSS战', weight: 2 }
  ];

  const selectedKey = weightedRandom(weightedEvents);
  triggerFixedEvent(selectedKey);
}

// 固定触发某类事件（用于遗迹控制）
function triggerFixedEvent(eventName) {
  // 创建名称映射表
  const nameMap = {
    '战斗事件': 'BATTLE',
    '分岔路口': 'CROSSROAD',
    '宝箱': 'TREASURE',
    'BOSS战': 'BOSS'
  };

  const eventKey = nameMap[eventName] || eventName;
  const event = adventureEvents[eventKey];
  
  if (!event) return console.warn(`[神秘遗迹] 未找到事件：${eventName}`);

  const trigger = event.triggers[Math.floor(Math.random() * event.triggers.length)];
  const prompt = `神秘遗迹探索中，你们遭遇了事件：${event.name}，背景是：${trigger}，请用宠物语气进行自然描述，并询问主人该怎么办。不要暴露任何系统字段或后台设定。`;

  sendHiddenMessage('adventure_event', prompt, (aiResponse) => {
    applyStatusChanges({}, aiResponse);
    showAdventureOptions(event.name);
  });
}

// 宝箱事件处理完毕后的结算逻辑
function completeRuinsExploration() {
  const reward = Math.floor(30 * gameState.ruinsExploration.rewardMultiplier);
  updatePetStats({ achievement: reward });
  gameState.ruinsExploration = null;
  const prompt = `恭喜你完成神秘遗迹的探索，获得了 ${reward} 点成就奖励！你们的冒险旅程变得更加传奇。`;
  sendHiddenMessage('system', prompt, (aiResponse) => {
    applyStatusChanges({}, aiResponse);
    showAdventureOptionsByKeys(['continue_adventure', 'rest']);
  });
}

// 状态判断：遗迹中排除普通事件
function getAvailableAdventureEvents() {
  if (gameState.ruinsExploration?.isExploring) return null; // 用 triggerRuinsEvent 控制
  if (gameState.mysteryTask?.isAccepted) {
    return Object.keys(adventureEvents).filter(type => adventureEvents[type].name !== '神秘任务');
  }
  return Object.keys(adventureEvents);
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
      
      triggered = true;
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
      
      triggered = true;
    }
  }

  // 只有在触发了提醒时才更新按钮
  if (triggered) {
    updateActionButtons();
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

  sendHiddenMessage(type, message, (aiResponse) => {
    applyStatusChanges({}, aiResponse, true);
    updateActionButtons();
  });
}

// ✅ 隐性消息发送（玩家不可见）
function sendHiddenMessage(type, content, callback) {
  // ✅ 构造提示词
  const loadingId = `loading-${type}`;

  // ✅ 显示加载动画
  showLoadingIndicator(loadingId);

  const currentValue = gameState.pet?.stats?.[type] ?? '-';
  const prompt = `[SYSTEM_ALERT]类型:${type},当前值:${currentValue}[/SYSTEM_ALERT]${content}`;

  // ✅ 标记唯一追踪ID（避免并发混乱）
  const traceId = `${type}-${Date.now()}`;
  console.log(`🟡[sendHiddenMessage][${traceId}] 准备发送系统提示`);
  console.log(`🔸类型: ${type}`);
  console.log(`🔸当前值: ${currentValue}`);
  console.log(`🔸发送内容:\n${prompt}`);

  callCozeAPI(prompt).then(response => {
    hideLoadingIndicator(loadingId);

    // ✅ 提取清洗后的文本
    const cleanResponse = (typeof response === 'string')
      ? response.replace(/\[.*?\]/g, '')
      : cleanCozeResponse(response); 

    console.log(`🔹[sendHiddenMessage][${traceId}] 清洗后内容:\n${cleanResponse}`);

    // ✅ 传入回调
    if (typeof callback === 'function') {
      console.log(`🔸[sendHiddenMessage][${traceId}] 调用回调函数`);
      callback(cleanResponse);
    }

  }).catch(err => {
    hideLoadingIndicator(loadingId);
    console.error(`🔴[sendHiddenMessage][${traceId}] 调用失败:`, err);
  });
}

//AI响应处理
function processAIResponse(response, actionType = null) {
  console.log('🔵[processAIResponse] 开始处理 AI 响应');

  // 1. 清洗响应内容
  let cleanResponse = cleanCozeResponse(response);

  // 2. 动作型响应（如 feed/play/rest 等）
  if (actionType) {
    console.log('🔸[processAIResponse] 动作类型:', actionType);
    const changes = calculateChanges(actionType, cleanResponse);
    console.log('🔸[processAIResponse] 计算出的状态变化:', changes);

    applyStatusChanges(changes, cleanResponse);

    // ✅ 强制刷新按钮（不管是否满足冒险条件）
    setTimeout(() => updateActionButtons(), 100);

  } else {
    // 3. 普通聊天也要触发状态检测 + 按钮刷新
    console.log('🟣[processAIResponse] 无状态变更，仅显示普通回复');
    displayPetResponse(cleanResponse);

    // ✅ 检查状态 + 刷新按钮
    setTimeout(() => {
      checkCriticalStatus(); // 检查是否低血低饥饿提醒
      updateActionButtons(); // 刷新按钮状态
    }, 100);
  }
}

// 修改宠物状态值（如生命值、饥饿度、金币、历练值）
function updatePetStats(changes) {
  if (!gameState.pet) {
    console.error("游戏状态未初始化");
    return;
  }
  console.log("接收到的变化:", changes);
  const stats = gameState.pet.stats;

  // 检查所有变化，触发特效
  for (const [stat, value] of Object.entries(changes)) {
    if (value !== undefined) {
      // 只要值有变化就显示特效（正负都显示）
      showStatChange(stat, value);
      
      // 更新状态值
      if (stat === 'health' || stat === 'hunger') {
        stats[stat] = Math.min(100, Math.max(0, stats[stat] + value));
      } else {
        stats[stat] = Math.max(0, stats[stat] + value);
      }
    }
  }

  console.log("最终状态:", stats);

  // 保存状态并更新UI
  saveGameState();
  updateStatsUI();
}

// 飘升数字特效（传入属性名和变化值）
function showStatChange(statName, amount) {
  // 根据属性名获取对应的状态项
  const statLabels = {
    health: '生命值',
    hunger: '饥饿度',
    gold: '金币',
    bond: '历练值'
  };
  
  const statusItems = document.querySelectorAll('.status-item');
  let targetStatusItem = null;
  
  for (const item of statusItems) {
    const label = item.querySelector('.status-label');
    if (label && label.textContent.includes(statLabels[statName])) {
      targetStatusItem = item;
      break;
    }
  }

  if (!targetStatusItem) return;

  // 根据正负决定颜色
  const color = amount >= 0 ? '#4CAF50' : '#F44336'; // 正数绿色，负数红色
  const symbol = amount >= 0 ? '+' : ''; // 正数显示+号，负数自带-号

  // 创建飘升数字元素
  const floatText = document.createElement('div');
  floatText.className = 'floating-change';
  floatText.textContent = `${symbol}${amount}`;

  // 设置样式
  floatText.style.position = 'absolute';
  floatText.style.left = '110px';
  floatText.style.top = '0px';
  floatText.style.color = color;
  floatText.style.fontSize = '18px';
  floatText.style.fontWeight = 'bold';
  floatText.style.textShadow = '0 0 3px rgba(0,0,0,0.5)';
  floatText.style.animation = 'floatUp 3s ease-out forwards';

  // 确保父容器有相对定位
  targetStatusItem.style.position = 'relative';
  targetStatusItem.appendChild(floatText);

  // 动画结束自动移除
  floatText.addEventListener('animationend', () => {
    floatText.remove();
  });

  // 触发粒子效果（数量根据变化幅度调整）
  const particleCount = Math.min(Math.abs(Math.round(amount / 5)), 15);
  showStatParticles(targetStatusItem, color, particleCount);
}

// 粒子动画函数
function showStatParticles(parentEl, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.position = 'absolute';
    particle.style.width = '6px';
    particle.style.height = '6px';
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.left = '110px';
    particle.style.top = '10px';
    particle.style.animation = `particleMove ${Math.random() * 0.5 + 0.5}s ease-out forwards`;
    particle.style.opacity = '0.8';

    // 随机动画参数
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 30 + 20;
    particle.style.setProperty('--end-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--end-y', `${Math.sin(angle) * distance}px`);

    parentEl.appendChild(particle);

    // 动画完成自动移除
    particle.addEventListener('animationend', () => {
      particle.remove();
    });
  }
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

// 应用结果到玩家状态
function applyStatusChanges(changes, response, suppressCheck = false) {
    console.log('🔸[applyStatusChanges] 输入 changes:', changes);
    
    // 1. 验证并过滤掉0值变化
    const filteredChanges = {};
    Object.keys(changes).forEach(key => {
        if (changes[key] !== 0) filteredChanges[key] = changes[key];
    });
    
    // 2. 应用状态变化
    updatePetStats(changes);
    
    // 3. 处理响应消息
    let displayText = response;
    
    // 4. 只在有实际变化时显示状态提示
    if (Object.keys(filteredChanges).length > 0) {
        const statusMsg = buildStatusMessage(filteredChanges);
        displayText = `${response} ${statusMsg}`.trim();
    }
    
    // 5. 显示消息
    addMessageToChat('system', displayText || "（轻轻蹭了蹭你）");
    
    // 6. 检查关键状态（除非明确禁止）
    if (!suppressCheck) checkCriticalStatus();
}

//给 AI 的提示用。简洁摘要（用于生成 prompt）
function buildStatusMessage(changes) {
    const parts = [];
    
    // 只显示非零的变化值
    if (changes.health !== undefined && changes.health !== 0) {
        parts.push(`生命值${changes.health > 0 ? '+' : ''}${changes.health}`);
    }
    if (changes.hunger !== undefined && changes.hunger !== 0) {
        parts.push(`饥饿度${changes.hunger > 0 ? '+' : ''}${changes.hunger}`);
    }
    if (changes.gold !== undefined && changes.gold !== 0) {
        parts.push(`金币${changes.gold > 0 ? '+' : ''}${changes.gold}`);
    }
    if (changes.bond !== undefined && changes.bond !== 0) {
        parts.push(`历练值${changes.bond > 0 ? '+' : ''}${changes.bond}`);
    }
    
    return parts.length ? `（${parts.join('，')}）` : null;
}

//给玩家看的详细状态变化（HTML换行格式）
function buildResultSummary(result) {
  const parts = [];

  if (result.health < 0) parts.push(`受到了 ${-result.health} 点伤害`);
  if (result.hunger < 0) parts.push(`消耗了 ${-result.hunger} 点体力`);
  if (result.gold > 0) parts.push(`获得了 ${result.gold} 枚金币`);
  if (result.bond > 0) parts.push(`历练值增加了 ${result.bond} 点`);
  if (result.health > 0) parts.push(`恢复了 ${result.health} 点生命`);
  if (result.hunger > 0) parts.push(`恢复了 ${result.hunger} 点体力`);
  if (result.gold < 0) parts.push(`损失了 ${-result.gold} 枚金币`);
  
  return parts.join('，');
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

// 随机状态计算函数
function getRandomStatChange(actionType) {
  // 基础行为配置（喂食/玩耍/休息）
  const BASE_BEHAVIORS = {
    feed: { 
      hunger: [70, 80],   // 喂食恢复70-80点饥饿度
      gold: [-2, -2]      // 固定扣除2金币
    },
    play: { 
      hunger: [-20, -5]   // 玩耍消耗5-20点饥饿度
    }, 
    rest: { 
      health: [35, 80],   // 休息恢复35-80点生命值
      gold: [-20, -20]    // 固定扣除20金币
    }
  };

  // 冒险事件配置（所有冒险相关行为）
  const ADVENTURE_ACTIONS = {
    // 通用冒险消耗（所有冒险行为都会应用）
    _base: {
      hunger: [-5, -1]    // 基础饥饿消耗
    },
    
    // 战斗类-正面战斗
    battle_attack: {
      health: [-10, -3],  // 可能受伤
      gold: [1, 10],      // 获得1-10金币
      bond: [1, 5]        // 增加1-5羁绊值
    },

    // 战斗类-偷袭
    battle_trick: {
      health: [-5, 0],    // 较少受伤
      gold: [1, 10],
      bond: [1, 5]
    },

    // BOSS战
    boss_fight: {
      health: [-15, -5],  // 较大伤害
      gold: [10, 20],     // 更多奖励
      bond: [10, 20]      // 更多羁绊
    },

    // 神秘商人
    merchant_buy: {
      gold: [-12, -5],    // 花费金币
      health: [20, 50]    // 恢复生命
    },

    // 宝箱类（合并两种操作）
    treasure_open: {
      gold: [5, 20],      // 获得5-20金币
      health: [-10, 10],  // 可能受伤或恢复
      hunger: [-15, 20]   // 消耗或恢复体力
    },

    // 分岔路口
    crossroad_left: { health: [-10, 10] },
    crossroad_middle: { health: [-10, 10] },
    crossroad_right: { health: [-10, 10] },

    // 特殊事件
    keep_memories: { bond: [20, 50] },  // 拍照留念
    share: { gold: [100, 200] },        // 分享奖励
    enter: { gold: [100, 200] },        // 进入遗迹

    go_rest: {
      health: [50, 80],  // 可能受伤或恢复
      hunger: [30, 60]   // 消耗或恢复体力
    },

    // 默认冒险行为
    default: {
      bond: [1, 5]  // 基础羁绊增长
    }
  };

  // 处理基础行为（喂食/玩耍/休息）
  if (BASE_BEHAVIORS[actionType]) {
    const ranges = BASE_BEHAVIORS[actionType];
    return {
      hunger: ranges.hunger ? getRandomInRange(...ranges.hunger) : 0,
      health: ranges.health ? getRandomInRange(...ranges.health) : 0,
      gold: ranges.gold ? getRandomInRange(...ranges.gold) : 0,
      bond: 0,  // 基础行为不加羁绊值
      mood: 0
    };
  } 
  
  // 处理冒险行为
  else {
    const actionConfig = ADVENTURE_ACTIONS[actionType] || ADVENTURE_ACTIONS.default;
    
    // 合并基础消耗和特定行为效果
    const changes = {
      hunger: getRandomInRange(...ADVENTURE_ACTIONS._base.hunger),
      health: 0,
      gold: 0,
      bond: 0,
      mood: 0
    };

    // 应用特定行为的效果
    if (actionConfig.health) changes.health += getRandomInRange(...actionConfig.health);
    if (actionConfig.gold) changes.gold += getRandomInRange(...actionConfig.gold);
    if (actionConfig.bond) changes.bond += getRandomInRange(...actionConfig.bond);
    if (actionConfig.hunger) changes.hunger += getRandomInRange(...actionConfig.hunger);

    console.log(`生成的${actionType}状态变化:`, changes);
    return changes;
  }
}

// 辅助函数：生成区间随机数
function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// 权重随机函数
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item.key; // ✅ 返回 key 而不是 item.name
  }

  // fallback，理论不会走到这
  return items[items.length - 1].key;
}

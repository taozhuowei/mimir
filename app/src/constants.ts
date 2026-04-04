/**
 * 全局常量
 * 存放项目级别的固定配置值
 */
/** 卡牌静态资源根路径
 * 使用相对路径 ./static/ 兼容 H5 子目录部署、直接打开产物和小程序编译产物。
 */
export const TAROT_THEME_ASSET_BASE = './static/themes/golden_dawn/tarot'

/** 卡牌背面图片路径（golden_dawn 主题）
 * 使用相对路径 ./static/ 确保 H5 端在子目录部署或直接打开文件时也能正确加载
 * 微信小程序端同样兼容相对路径
 */
export const CARD_BACK_IMAGE = `${TAROT_THEME_ASSET_BASE}/card_back.jpeg`

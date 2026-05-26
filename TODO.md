1. app/src/flows/index里的内容和shared里的内容混合到app/src/flows/base目录中，作为基础组件和逻辑给其他模块使用。
2. 新建flows/action_area目录存放actionArea组件和相关逻辑，避免和答案组件混合。
3. playview设置为flex布局，内部纵向放置header、content-view（类名改名为stage）、answer-zone（类名改名叫answer）和action_area
4. 检查MainSurface内部的逻辑、样式是否有能下沉到具体组件的部分。如有则修改。
5. 补充必要代码行的注释。将注释改写成中文。语言精简、高效、专业。禁止直译。禁止描述与代码功能、职责等无关的内容。禁止冗余格式。
6. app/src/base/composables移动到flows/base/composables
7. app\src\core\styles\overlay\_tokens.css 这个文件的作用是什么? 是否能和

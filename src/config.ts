import type { WritableComputedRef } from '@vue/reactivity'
import { computed, reactive, ref, shallowRef } from '@vue/reactivity'
import type { QuickPickItem } from 'vscode'
import { Uri, workspace } from 'vscode'
import { all as langCodes } from 'locale-codes'

// @ts-expect-error missing types
import { words as popularWords } from 'popular-english-words'
import { EXT_NAMESPACE } from './meta'
import { useExtensionContext } from './dependence'
import type { Context } from '~/context'

const _configLastUpdated = ref(0)

function getConfig<T = any>(key: string): T | undefined {
  return workspace
    .getConfiguration()
    .get<T>(key)
}

async function setConfig(key: string, value: any, isGlobal = true) {
  // update value
  return await workspace
    .getConfiguration()
    .update(key, value, isGlobal)
}

function createConfigRef<T>(
  key: string,
  defaultValue: T,
  isGlobal = true,
): WritableComputedRef<T> {
  const getValue = () => getConfig<T>(key) ?? defaultValue
  const state = shallowRef<T | undefined>(getValue())
  let lastTimestamp = _configLastUpdated.value

  return computed<T>({
    get: () => {
      if (lastTimestamp !== _configLastUpdated.value) {
        state.value = getValue()
        lastTimestamp = _configLastUpdated.value
      }
      return state.value
    },
    set: (v: any) => {
      state.value = v as any
      setConfig(key, v, isGlobal)
    },
  })
}

export function onConfigUpdated() {
  _configLastUpdated.value = Date.now()
}

export const config = reactive({
  defaultTargetLanguage: createConfigRef(`${EXT_NAMESPACE}.defaultTargetLanguage`, 'zh-CN'),
  secondLanguage: createConfigRef(`${EXT_NAMESPACE}.secondLanguage`, ''),

  // providers
  googleTranslateProxy: createConfigRef(`${EXT_NAMESPACE}.googleProxy`, ''),

  /** you can use https://cors-anywhere.herokuapp.com/ at "vscode for web" */
  corsProxy: createConfigRef(`${EXT_NAMESPACE}.corsProxy`, ''),

  textSize: 0.9,

  extensionUri: Uri.file(''),

  minWordLength: createConfigRef(`${EXT_NAMESPACE}.minWordLength`, 4),

  knownWords: createConfigRef<string[]>(`${EXT_NAMESPACE}.knownWords`, []),

  knownPopularWordCount: createConfigRef<number>(`${EXT_NAMESPACE}.knownPopularWordCount`, 0),

  customTranslations: createConfigRef<{ [key: string]: string }>(`${EXT_NAMESPACE}.customTranslations`, {}),
})

export const knownWords = computed(() => [
  ...config.knownWords.map(w => w.toLowerCase()),
  ...popularWords.getMostPopular(config.knownPopularWordCount),
])

export function isKnownWords(word: string) {
  return knownWords.value.includes(word.toLowerCase().replace(/[^\w\._-]/g, ''))
}

export function isPhraseExcluded(phrase: string) {
  if (phrase.length < config.minWordLength)
    return true
  if (isKnownWords(phrase))
    return true
  // Skip phrase that contains no alphabet characters
  if (!phrase.match(/[a-zA-Z]/))
    return true
  return false
}

export function registerConfig(ctx: Context) {
  const extCtx = useExtensionContext(ctx)
  config.extensionUri = extCtx.extensionUri
}

export const languageOptions: QuickPickItem[] = langCodes.map(item => ({
  label: item.local || item.name,
  description: item.tag,
}))

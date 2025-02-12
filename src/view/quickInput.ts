import type { QuickPick, QuickPickItem } from 'vscode'
import { QuickInputButtons, QuickPickItemKind, commands, window } from 'vscode'
import { config, languageOptions } from '~/config'
import type { Context } from '~/context'
import { useStore } from '~/store'
import type { Fn } from '~/types'
import { supportLanguage } from '~/providers/tranlations'

export function showTranslatePopmenu(ctx: Context) {
  const store = useStore(ctx)

  const quickPick = window.createQuickPick()
  quickPick.title = 'Interline Translate'
  defineQuickPickItems(quickPick, [
    store.enableContinuousTranslation || store.enableContinuousTranslationOnce
      ? { // Stop
          alwaysShow: true,
          picked: true,
          label: '$(stop-circle) Stop',
          detail: 'Stop translating documents',
          callback: () => commands.executeCommand('interline-translate.stopTranslatingDocuments').then(() => quickPick.dispose()),
        }
      : { // Start
          alwaysShow: true,
          picked: true,
          label: '$(run-all) Translate',
          detail: 'Start translating documents',
          callback: () => commands.executeCommand('interline-translate.startTranslatingDocuments').then(() => quickPick.dispose()),
        },
    {
      label: 'Options',
      kind: QuickPickItemKind.Separator,
    },
    {
      label: '$(globe) Target:',
      description: languageOptions.find(item => item.description === config.defaultTargetLanguage)?.label,
      callback: () => showSetLanguagePopmenu(ctx, 'target'),
    },
    {
      label: '$(file-code) Source:',
      description: 'English',
      callback: () => showSetLanguagePopmenu(ctx, 'source'),
    },
    {
      label: '$(cloud) Service:',
      description: 'Google Translate',
      callback: () => showSetTranslationService(ctx),
    },
  ])
  quickPick.onDidHide(() => quickPick.dispose())
  quickPick.show()
}

export function showSetLanguagePopmenu(ctx: Context, type: 'target' | 'source') {
  const quickPick = window.createQuickPick()
  quickPick.matchOnDescription = true

  quickPick.title = type === 'target'
    ? 'Target Language'
    : 'Source Language'

  const currentLang = type === 'target'
    ? config.defaultTargetLanguage
    : 'en'

  quickPick.items = languageOptions
    .filter(item => type === 'target'
      ? supportLanguage.google[item.description!]
      : item.description === 'en',
    )
    .map((item) => {
      const isCurrent = item.description === currentLang
      return {
        ...item,
        label: `${isCurrent ? '$(check) ' : '$(array) '}${item.label}`,
      }
    })

  quickPick.onDidChangeSelection((selection) => {
    window.showInformationMessage(`Selected ${type} language: ${selection[0].label.split(') ')[1]}`)
    const selectedLanguage = selection[0].description
    if (!selectedLanguage) {
      window.showErrorMessage('Invalid language')
      return
    }

    if (type === 'target') {
      config.defaultTargetLanguage = selectedLanguage
    }
    else {
      // @TODO: set source language
      window.showErrorMessage('Not implemented')
    }

    showTranslatePopmenu(ctx)
  })

  quickPick.buttons = [
    QuickInputButtons.Back,
  ]
  quickPick.onDidTriggerButton((button) => {
    if (button === QuickInputButtons.Back)
      showTranslatePopmenu(ctx)
  })

  quickPick.onDidHide(() => quickPick.dispose())
  quickPick.show()
}

export function showSetTranslationService(ctx: Context) {
  const quickPick = window.createQuickPick()
  quickPick.title = 'Translation Service'
  quickPick.matchOnDescription = true
  quickPick.matchOnDetail = true
  defineQuickPickItems(quickPick, [
    {
      key: 'google',
      label: 'Google Translate',
      description: 'Powered by Google Translate',
    },
    // TODO add more translation services
    // {
    //   label: 'Baidu Translate',
    //   description: 'Powered by Baidu Translate',
    // },
    // {
    //   label: 'Youdao Translate',
    //   description: 'Powered by Youdao Translate',
    // },
    // {
    //   label: 'More...',
    //   description: 'Install more translate sources from Extensions Marketplace',
    // },
  ])

  quickPick.onDidChangeSelection((selection) => {
    window.showInformationMessage(`Selected service: ${selection[0].label}`)
    showTranslatePopmenu(ctx)
  })

  quickPick.buttons = [
    QuickInputButtons.Back,
  ]
  quickPick.onDidTriggerButton((button) => {
    if (button === QuickInputButtons.Back)
      showTranslatePopmenu(ctx)
  })

  quickPick.onDidHide(() => quickPick.dispose())
  quickPick.show()
}

function defineQuickPickItems<I extends QuickPickItem, Q extends QuickPick<QuickPickItem>>(quickPick: Q, items: (I & { callback?: Fn })[]) {
  const map = new Map<string, Fn>()
  const _items: QuickPickItem[] = []
  for (const index in items) {
    const item = items[index]
    const { callback, ...others } = item
    if (callback)
      map.set(item.label, callback)
    _items[index] = others
  }

  quickPick.items = _items

  if (map.size) {
    quickPick.onDidChangeSelection((selection) => {
      const label = selection[0].label
      const callback = map.get(label)
      if (callback)
        callback()
    })
  }
}

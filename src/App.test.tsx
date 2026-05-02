import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'

const STORAGE_KEY = 'todos'

function setup() {
  const user = userEvent.setup()
  render(<App />)
  return { user }
}

async function addTodo(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByPlaceholderText('タスクを入力してEnter...')
  await user.type(input, text)
  await user.keyboard('{Enter}')
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

// ─── 初期表示 ───────────────────────────────────────────────
describe('初期表示', () => {
  it('タイトル "TODO" が表示される', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'TODO' })).toBeInTheDocument()
  })

  it('入力欄が表示される', () => {
    setup()
    expect(screen.getByPlaceholderText('タスクを入力してEnter...')).toBeInTheDocument()
  })

  it('タスクがないとき空メッセージが表示される', () => {
    setup()
    expect(screen.getByText('タスクはありません')).toBeInTheDocument()
  })

  it('タスクがないときフッターは表示されない', () => {
    setup()
    expect(screen.queryByText(/件残り/)).not.toBeInTheDocument()
  })
})

// ─── タスクの追加 ────────────────────────────────────────────
describe('タスクの追加', () => {
  it('テキストを入力してEnterでタスクが追加される', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
  })

  it('追加後に入力欄がクリアされる', async () => {
    const { user } = setup()
    const input = screen.getByPlaceholderText('タスクを入力してEnter...')
    await user.type(input, '牛乳を買う')
    await user.keyboard('{Enter}')
    expect(input).toHaveValue('')
  })

  it('空文字ではタスクが追加されない', async () => {
    const { user } = setup()
    const input = screen.getByPlaceholderText('タスクを入力してEnter...')
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('スペースのみではタスクが追加されない', async () => {
    const { user } = setup()
    await user.type(screen.getByPlaceholderText('タスクを入力してEnter...'), '   ')
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('複数タスクを追加できる', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク1')
    await addTodo(user, 'タスク2')
    await addTodo(user, 'タスク3')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('新しいタスクはリストの先頭に追加される', async () => {
    const { user } = setup()
    await addTodo(user, '最初')
    await addTodo(user, '最後')
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('最後')
    expect(items[1]).toHaveTextContent('最初')
  })
})

// ─── タスクの完了/未完了 ─────────────────────────────────────
describe('タスクの完了トグル', () => {
  it('チェックボックスを押すと完了状態になる', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    const checkbox = screen.getByRole('button', { name: '完了にする' })
    await user.click(checkbox)
    expect(screen.getByRole('button', { name: '未完了にする' })).toBeInTheDocument()
  })

  it('完了済みのタスクはliにcompletedクラスがつく', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.click(screen.getByRole('button', { name: '完了にする' }))
    const item = screen.getByRole('listitem')
    expect(item).toHaveClass('completed')
  })

  it('完了済みタスクをもう一度押すと未完了に戻る', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.click(screen.getByRole('button', { name: '完了にする' }))
    await user.click(screen.getByRole('button', { name: '未完了にする' }))
    expect(screen.getByRole('listitem')).not.toHaveClass('completed')
  })
})

// ─── タスクの削除 ────────────────────────────────────────────
describe('タスクの削除', () => {
  it('削除ボタンを押すとタスクが消える', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(screen.queryByText('牛乳を買う')).not.toBeInTheDocument()
  })

  it('複数タスクがあるとき対象のタスクだけ削除される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスクA')
    await addTodo(user, 'タスクB')
    const items = screen.getAllByRole('listitem')
    await user.click(within(items[0]).getByRole('button', { name: '削除' }))
    expect(screen.queryByText('タスクB')).not.toBeInTheDocument()
    expect(screen.getByText('タスクA')).toBeInTheDocument()
  })
})

// ─── タスクの編集 ────────────────────────────────────────────
describe('タスクの編集', () => {
  it('テキストをダブルクリックすると編集モードになる', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.dblClick(screen.getByText('牛乳を買う'))
    expect(screen.getByDisplayValue('牛乳を買う')).toBeInTheDocument()
  })

  it('編集してEnterで保存される', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.dblClick(screen.getByText('牛乳を買う'))
    const editInput = screen.getByDisplayValue('牛乳を買う')
    await user.clear(editInput)
    await user.type(editInput, 'パンを買う')
    await user.keyboard('{Enter}')
    expect(screen.getByText('パンを買う')).toBeInTheDocument()
    expect(screen.queryByText('牛乳を買う')).not.toBeInTheDocument()
  })

  it('Escapeキーで編集がキャンセルされ元のテキストに戻る', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.dblClick(screen.getByText('牛乳を買う'))
    const editInput = screen.getByDisplayValue('牛乳を買う')
    await user.clear(editInput)
    await user.type(editInput, 'パンを買う')
    await user.keyboard('{Escape}')
    expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
    expect(screen.queryByText('パンを買う')).not.toBeInTheDocument()
  })

  it('空文字で確定しても元のテキストが保持される', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.dblClick(screen.getByText('牛乳を買う'))
    const editInput = screen.getByDisplayValue('牛乳を買う')
    await user.clear(editInput)
    await user.keyboard('{Enter}')
    expect(screen.getByText('牛乳を買う')).toBeInTheDocument()
  })

  it('テキストの前後スペースはトリムされて保存される', async () => {
    const { user } = setup()
    await addTodo(user, '牛乳を買う')
    await user.dblClick(screen.getByText('牛乳を買う'))
    const editInput = screen.getByDisplayValue('牛乳を買う')
    await user.clear(editInput)
    await user.type(editInput, '  パンを買う  ')
    await user.keyboard('{Enter}')
    expect(screen.getByText('パンを買う')).toBeInTheDocument()
  })
})

// ─── フィルター ──────────────────────────────────────────────
describe('フィルター', () => {
  async function setupWithMixedTodos() {
    const { user } = setup()
    await addTodo(user, '未完了タスク')
    await addTodo(user, '完了タスク')
    await user.click(screen.getAllByRole('button', { name: '完了にする' })[0])
    return { user }
  }

  it('「すべて」フィルターで全タスクが表示される', async () => {
    await setupWithMixedTodos()
    await userEvent.click(screen.getByRole('button', { name: 'すべて' }))
    expect(screen.getByText('完了タスク')).toBeInTheDocument()
    expect(screen.getByText('未完了タスク')).toBeInTheDocument()
  })

  it('「未完了」フィルターで未完了タスクのみ表示される', async () => {
    const { user } = await setupWithMixedTodos()
    await user.click(screen.getByRole('button', { name: '未完了' }))
    expect(screen.getByText('未完了タスク')).toBeInTheDocument()
    expect(screen.queryByText('完了タスク')).not.toBeInTheDocument()
  })

  it('「完了」フィルターで完了タスクのみ表示される', async () => {
    const { user } = await setupWithMixedTodos()
    await user.click(screen.getByRole('button', { name: '完了' }))
    expect(screen.getByText('完了タスク')).toBeInTheDocument()
    expect(screen.queryByText('未完了タスク')).not.toBeInTheDocument()
  })

  it('「未完了」フィルター時に未完了タスクがないと専用メッセージが表示される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByRole('button', { name: '完了にする' }))
    await user.click(screen.getByRole('button', { name: '未完了' }))
    expect(screen.getByText('未完了のタスクはありません')).toBeInTheDocument()
  })

  it('「完了」フィルター時に完了タスクがないと専用メッセージが表示される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByRole('button', { name: '完了' }))
    expect(screen.getByText('完了したタスクはありません')).toBeInTheDocument()
  })

  it('選択中のフィルターボタンに active クラスがつく', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByRole('button', { name: '未完了' }))
    expect(screen.getByRole('button', { name: '未完了' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'すべて' })).not.toHaveClass('active')
  })
})

// ─── 一括完了トグル ──────────────────────────────────────────
describe('一括完了トグル', () => {
  it('全タスクをまとめて完了にできる', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク1')
    await addTodo(user, 'タスク2')
    await user.click(screen.getByTitle('すべて完了/未完了'))
    const items = screen.getAllByRole('listitem')
    items.forEach(item => expect(item).toHaveClass('completed'))
  })

  it('全タスクが完了済みのときはまとめて未完了に戻せる', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク1')
    await addTodo(user, 'タスク2')
    await user.click(screen.getByTitle('すべて完了/未完了'))
    await user.click(screen.getByTitle('すべて完了/未完了'))
    const items = screen.getAllByRole('listitem')
    items.forEach(item => expect(item).not.toHaveClass('completed'))
  })

  it('全タスク完了時に toggle-all ボタンに all-completed クラスがつく', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByTitle('すべて完了/未完了'))
    expect(screen.getByTitle('すべて完了/未完了')).toHaveClass('all-completed')
  })

  it('タスクがないとき一括完了ボタンは表示されない', () => {
    setup()
    expect(screen.queryByTitle('すべて完了/未完了')).not.toBeInTheDocument()
  })
})

// ─── 完了タスクの一括削除 ────────────────────────────────────
describe('完了を削除', () => {
  it('完了タスクをまとめて削除できる', async () => {
    const { user } = setup()
    await addTodo(user, '未完了')
    await addTodo(user, '完了する')
    await user.click(screen.getAllByRole('button', { name: '完了にする' })[0])
    await user.click(screen.getByRole('button', { name: '完了を削除' }))
    expect(within(screen.getByRole('list')).getByText('未完了')).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: '完了する' })).not.toBeInTheDocument()
  })

  it('完了タスクがないとき「完了を削除」ボタンは表示されない', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    expect(screen.queryByRole('button', { name: '完了を削除' })).not.toBeInTheDocument()
  })
})

// ─── カウント表示 ────────────────────────────────────────────
describe('残り件数の表示', () => {
  it('未完了タスク数が正しく表示される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク1')
    await addTodo(user, 'タスク2')
    await addTodo(user, 'タスク3')
    expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument()
  })

  it('タスクを完了にするとカウントが減る', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク1')
    await addTodo(user, 'タスク2')
    await user.click(screen.getAllByRole('button', { name: '完了にする' })[0])
    expect(screen.getByText('1', { selector: 'strong' })).toBeInTheDocument()
  })

  it('全タスク完了時はカウントが 0 になる', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByRole('button', { name: '完了にする' }))
    expect(screen.getByText('0', { selector: 'strong' })).toBeInTheDocument()
  })
})

// ─── ヒントテキスト ──────────────────────────────────────────
describe('ヒントテキスト', () => {
  it('タスクが存在するとき「ダブルクリックで編集」が表示される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    expect(screen.getByText('ダブルクリックで編集')).toBeInTheDocument()
  })

  it('タスクがないときヒントは表示されない', () => {
    setup()
    expect(screen.queryByText('ダブルクリックで編集')).not.toBeInTheDocument()
  })
})

// ─── localStorage の永続化 ──────────────────────────────────
describe('localStorage', () => {
  it('タスクを追加すると localStorage に保存される', async () => {
    const { user } = setup()
    await addTodo(user, '永続化タスク')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].text).toBe('永続化タスク')
  })

  it('完了状態が localStorage に保存される', async () => {
    const { user } = setup()
    await addTodo(user, 'タスク')
    await user.click(screen.getByRole('button', { name: '完了にする' }))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    expect(stored[0].completed).toBe(true)
  })

  it('localStorage にデータがあればマウント時に復元される', () => {
    const initial = [
      { id: 'abc', text: '復元タスク', completed: false, createdAt: Date.now() },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    render(<App />)
    expect(screen.getByText('復元タスク')).toBeInTheDocument()
  })

  it('localStorage のデータが壊れていても空で起動する', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json')
    render(<App />)
    expect(screen.getByText('タスクはありません')).toBeInTheDocument()
  })
})

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Todo, Filter } from './types'
import './App.css'

const STORAGE_KEY = 'todos'

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Todo[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const addTodo = () => {
    const text = input.trim()
    if (!text) return
    setTodos(prev => [
      { id: generateId(), text, completed: false, createdAt: Date.now() },
      ...prev,
    ])
    setInput('')
  }

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    )
  }

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
  }

  const saveEdit = () => {
    const text = editingText.trim()
    if (text && editingId) {
      setTodos(prev =>
        prev.map(t => (t.id === editingId ? { ...t, text } : t)),
      )
    }
    setEditingId(null)
    setEditingText('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingText('')
  }

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !t.completed))
  }

  const toggleAll = () => {
    const allCompleted = todos.every(t => t.completed)
    setTodos(prev => prev.map(t => ({ ...t, completed: !allCompleted })))
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">TODO</h1>
      </header>

      <div className="card">
        <div className="input-row">
          {todos.length > 0 && (
            <button
              className={`toggle-all ${todos.every(t => t.completed) ? 'all-completed' : ''}`}
              onClick={toggleAll}
              title="すべて完了/未完了"
            >
              ❯
            </button>
          )}
          <input
            className="new-todo"
            type="text"
            placeholder="タスクを入力してEnter..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') addTodo()
            }}
          />
        </div>

        {filteredTodos.length > 0 ? (
          <ul className="todo-list">
            {filteredTodos.map(todo => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''}`}
              >
                {editingId === todo.id ? (
                  <input
                    ref={editInputRef}
                    className="edit-input"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onBlur={saveEdit}
                  />
                ) : (
                  <>
                    <button
                      className={`checkbox ${todo.completed ? 'checked' : ''}`}
                      onClick={() => toggleTodo(todo.id)}
                      aria-label={todo.completed ? '未完了にする' : '完了にする'}
                    >
                      {todo.completed && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span
                      className="todo-text"
                      onDoubleClick={() => startEditing(todo)}
                    >
                      {todo.text}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => deleteTodo(todo.id)}
                      aria-label="削除"
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            {filter === 'all'
              ? 'タスクはありません'
              : filter === 'active'
              ? '未完了のタスクはありません'
              : '完了したタスクはありません'}
          </div>
        )}

        {todos.length > 0 && (
          <footer className="footer">
            <span className="count">
              <strong>{activeCount}</strong> 件残り
            </span>
            <div className="filters">
              {(['all', 'active', 'completed'] as Filter[]).map(f => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'すべて' : f === 'active' ? '未完了' : '完了'}
                </button>
              ))}
            </div>
            {completedCount > 0 && (
              <button className="clear-btn" onClick={clearCompleted}>
                完了を削除
              </button>
            )}
          </footer>
        )}
      </div>

      {todos.length > 0 && (
        <p className="hint">ダブルクリックで編集</p>
      )}
    </div>
  )
}

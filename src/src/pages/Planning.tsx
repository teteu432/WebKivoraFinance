import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import type { Goal, GoalContribution } from '../types'
import { addDaysISO, brl, daysUntil, localDateISO, shortDate } from '../utils/format'
import { isValidDate, isValidMoney, isValidNonNegativeMoney, normalizeText } from '../utils/validation'

const createInitial = () => ({
  name: '',
  description: '',
  targetAmount: '',
  savedAmount: '0',
  monthlyAmount: '',
  targetDate: addDaysISO(180),
})

const createContributionInitial = () => ({ amount: '', date: localDateISO(), notes: '' })

type GoalFilter = 'all' | 'active' | 'attention' | 'completed'
type GoalStatus = 'completed' | 'on-track' | 'attention' | 'overdue' | 'unplanned'

const monthCountUntil = (targetDate: string) => {
  const days = daysUntil(targetDate)
  if (days <= 0) return 0
  return Math.max(1, Math.ceil(days / 30))
}

const forecastDate = (months: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setMonth(date.getMonth() + months)
  return localDateISO(date)
}

const goalInfo = (goal: Goal) => {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount)
  const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0
  const availableMonths = monthCountUntil(goal.targetDate)
  const idealMonthly = remaining > 0 && availableMonths > 0 ? remaining / availableMonths : 0
  const estimatedMonths = remaining > 0 && goal.monthlyAmount > 0 ? Math.ceil(remaining / goal.monthlyAmount) : 0
  const estimatedDate = estimatedMonths > 0 ? forecastDate(estimatedMonths) : null

  let status: GoalStatus = 'on-track'
  if (remaining <= 0) status = 'completed'
  else if (daysUntil(goal.targetDate) < 0) status = 'overdue'
  else if (goal.monthlyAmount <= 0) status = 'unplanned'
  else if (goal.monthlyAmount + 0.005 < idealMonthly) status = 'attention'

  return { remaining, progress, availableMonths, idealMonthly, estimatedMonths, estimatedDate, status }
}

const statusLabel: Record<GoalStatus, string> = {
  completed: 'Concluída',
  'on-track': 'No ritmo',
  attention: 'Ajustar plano',
  overdue: 'Prazo vencido',
  unplanned: 'Sem aporte mensal',
}

export default function Planning() {
  const {
    goals,
    goalContributions,
    addGoal,
    updateGoal,
    removeGoal,
    addGoalContribution,
    removeGoalContribution,
  } = useFinance()
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState(createInitial)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<GoalFilter>('all')

  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null)
  const [contributionForm, setContributionForm] = useState(createContributionInitial)
  const [contributionError, setContributionError] = useState('')
  const [savingContribution, setSavingContribution] = useState(false)

  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null)
  const [contributionDeleteTarget, setContributionDeleteTarget] = useState<GoalContribution | null>(null)
  const [deletingContribution, setDeletingContribution] = useState(false)

  const currentMonth = localDateISO().slice(0, 7)
  const totals = useMemo(() => {
    const target = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
    const saved = goals.reduce((sum, goal) => sum + Math.min(goal.savedAmount, goal.targetAmount), 0)
    const remaining = goals.reduce((sum, goal) => sum + Math.max(0, goal.targetAmount - goal.savedAmount), 0)
    const monthlyPlan = goals.reduce((sum, goal) => sum + (goalInfo(goal).status === 'completed' ? 0 : goal.monthlyAmount), 0)
    const contributedThisMonth = goalContributions
      .filter((item) => item.date.startsWith(currentMonth))
      .reduce((sum, item) => sum + item.amount, 0)
    const overallProgress = target > 0 ? Math.min(100, (saved / target) * 100) : 0
    const attention = goals.filter((goal) => ['attention', 'overdue', 'unplanned'].includes(goalInfo(goal).status)).length
    const completed = goals.filter((goal) => goalInfo(goal).status === 'completed').length
    return { target, saved, remaining, monthlyPlan, contributedThisMonth, overallProgress, attention, completed }
  }, [currentMonth, goalContributions, goals])

  const filteredGoals = useMemo(() => goals.filter((goal) => {
    const status = goalInfo(goal).status
    if (filter === 'completed') return status === 'completed'
    if (filter === 'active') return status !== 'completed'
    if (filter === 'attention') return ['attention', 'overdue', 'unplanned'].includes(status)
    return true
  }), [filter, goals])

  const edit = (goal: Goal) => {
    setEditing(goal)
    setForm({
      name: goal.name,
      description: goal.description,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      monthlyAmount: String(goal.monthlyAmount),
      targetDate: goal.targetDate,
    })
    setFormError('')
    setOpen(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')

    const targetAmount = Number(form.targetAmount)
    const savedAmount = editing ? editing.savedAmount : Number(form.savedAmount)
    const monthlyAmount = Number(form.monthlyAmount || 0)
    const name = normalizeText(form.name)
    const description = form.description.trim()

    if (name.length < 2) return setFormError('Informe um nome com pelo menos 2 caracteres.')
    if (name.length > 180) return setFormError('O nome pode ter no máximo 180 caracteres.')
    if (!isValidMoney(targetAmount)) return setFormError('Informe um valor objetivo válido maior que zero.')
    if (!isValidNonNegativeMoney(savedAmount)) return setFormError('Informe um valor reservado válido, igual ou maior que zero.')
    if (savedAmount > targetAmount) return setFormError('O valor já guardado não pode ultrapassar o objetivo.')
    if (!isValidNonNegativeMoney(monthlyAmount)) return setFormError('Informe um valor mensal válido, igual ou maior que zero.')
    if (!isValidDate(form.targetDate)) return setFormError('Informe uma data objetivo válida.')
    if (description.length > 500) return setFormError('A descrição pode ter no máximo 500 caracteres.')

    const payload = { ...form, name, description, targetAmount, savedAmount, monthlyAmount }
    try {
      setSaving(true)
      if (editing) {
        await updateGoal({ ...payload, id: editing.id })
        showToast('Meta atualizada com sucesso.')
      } else {
        await addGoal(payload)
        showToast('Meta criada com sucesso.')
      }
      setOpen(false)
      setEditing(null)
      setForm(createInitial())
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a meta.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await removeGoal(deleteTarget.id)
      showToast('Meta excluída.')
      setDeleteTarget(null)
      if (historyGoal?.id === deleteTarget.id) setHistoryGoal(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível excluir a meta.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const openContribution = (goal: Goal) => {
    setContributionGoal(goal)
    setContributionForm(createContributionInitial())
    setContributionError('')
  }

  const submitContribution = async (event: FormEvent) => {
    event.preventDefault()
    if (!contributionGoal) return
    setContributionError('')

    const amount = Number(contributionForm.amount)
    const remaining = Math.max(0, contributionGoal.targetAmount - contributionGoal.savedAmount)
    const notes = contributionForm.notes.trim()

    if (!isValidMoney(amount)) return setContributionError('Informe um valor de aporte válido maior que zero.')
    if (amount - remaining > 0.005) return setContributionError(`O valor máximo para concluir esta meta é ${brl(remaining)}.`)
    if (!isValidDate(contributionForm.date)) return setContributionError('Informe uma data válida.')
    if (contributionForm.date > localDateISO()) return setContributionError('A data do aporte não pode estar no futuro.')
    if (notes.length > 300) return setContributionError('A observação pode ter no máximo 300 caracteres.')

    try {
      setSavingContribution(true)
      await addGoalContribution(contributionGoal.id, amount, contributionForm.date, notes || undefined)
      showToast('Aporte registrado com sucesso.')
      setContributionGoal(null)
    } catch (error) {
      setContributionError(error instanceof Error ? error.message : 'Não foi possível registrar o aporte.')
    } finally {
      setSavingContribution(false)
    }
  }

  const confirmContributionDelete = async () => {
    if (!contributionDeleteTarget) return
    try {
      setDeletingContribution(true)
      await removeGoalContribution(contributionDeleteTarget.id)
      showToast('Aporte removido e saldo da meta atualizado.')
      setContributionDeleteTarget(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível remover o aporte.', 'error')
    } finally {
      setDeletingContribution(false)
    }
  }

  const contributionsFor = (goalId: string) => goalContributions
    .filter((item) => item.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date))

  const visibleHistoryGoal = historyGoal ? goals.find((goal) => goal.id === historyGoal.id) ?? historyGoal : null

  return <div className="page-stack planning-page">
    <div className="page-title">
      <div>
        <span className="eyebrow">Objetivos</span>
        <h1>Planejamento</h1>
        <p>Defina metas, registre aportes e acompanhe se o plano está no ritmo certo.</p>
      </div>
      <button className="primary-btn" onClick={() => { setEditing(null); setForm(createInitial()); setFormError(''); setOpen(true) }}>
        <Plus size={17}/> Nova meta
      </button>
    </div>

    <section className="planning-summary-grid">
      <article className="planning-summary-card"><PiggyBank/><div><span>Acumulado nas metas</span><strong>{brl(totals.saved)}</strong><small>{totals.overallProgress.toFixed(0)}% do objetivo total</small></div></article>
      <article className="planning-summary-card"><Target/><div><span>Falta alcançar</span><strong>{brl(totals.remaining)}</strong><small>Objetivo total de {brl(totals.target)}</small></div></article>
      <article className="planning-summary-card"><TrendingUp/><div><span>Aportes neste mês</span><strong>{brl(totals.contributedThisMonth)}</strong><small>Histórico registrado na V2.8</small></div></article>
      <article className="planning-summary-card"><CalendarDays/><div><span>Plano mensal</span><strong>{brl(totals.monthlyPlan)}</strong><small>{totals.attention} meta(s) precisam de atenção</small></div></article>
    </section>

    {goals.length > 0 && <section className="planning-progress-strip">
      <div className="planning-progress-copy">
        <div><strong>Progresso geral</strong><span>{totals.completed} concluída(s) · {goals.length - totals.completed} em andamento</span></div>
        <strong>{totals.overallProgress.toFixed(0)}%</strong>
      </div>
      <div className="progress large"><i style={{ width: `${totals.overallProgress}%` }}/></div>
    </section>}

    <div className="planning-toolbar">
      <div className="tabs planning-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas</button>
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Em andamento</button>
        <button className={filter === 'attention' ? 'active' : ''} onClick={() => setFilter('attention')}>Atenção</button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Concluídas</button>
      </div>
      <span>{filteredGoals.length} de {goals.length} meta(s)</span>
    </div>

    {goals.length === 0
      ? <div className="panel"><EmptyState text="Nenhuma meta cadastrada. Crie sua primeira meta financeira."/></div>
      : filteredGoals.length === 0
        ? <div className="panel"><EmptyState text="Nenhuma meta corresponde a este filtro."/></div>
        : <div className="goals-grid planning-goals-grid">{filteredGoals.map((goal) => {
          const info = goalInfo(goal)
          const contributionCount = contributionsFor(goal.id).length
          const contributionThisMonth = contributionsFor(goal.id)
            .filter((item) => item.date.startsWith(currentMonth))
            .reduce((sum, item) => sum + item.amount, 0)

          return <article className={`goal-card planning-goal-card status-${info.status}`} key={goal.id}>
            <div className="goal-icon"><Target/></div>
            <div className={`goal-status-badge ${info.status}`}>
              {info.status === 'completed' ? <CheckCircle2 size={13}/> : info.status === 'on-track' ? <TrendingUp size={13}/> : <AlertTriangle size={13}/>} {statusLabel[info.status]}
            </div>
            <div className="row-actions goal-actions">
              <button className="icon-btn" aria-label={`Editar ${goal.name}`} onClick={() => edit(goal)}><Pencil size={16}/></button>
              <button className="icon-btn danger-text" aria-label={`Excluir ${goal.name}`} onClick={() => setDeleteTarget(goal)}><Trash2 size={16}/></button>
            </div>

            <h3>{goal.name}</h3>
            <p>{goal.description || 'Sem descrição.'}</p>

            <div className="planning-progress-head"><span>Progresso</span><strong>{info.progress.toFixed(0)}%</strong></div>
            <div className="progress large"><i style={{ width: `${info.progress}%` }}/></div>

            <div className="goal-values planning-goal-values">
              <div><span>Guardado</span><strong>{brl(goal.savedAmount)}</strong></div>
              <div><span>Falta</span><strong>{brl(info.remaining)}</strong></div>
              <div><span>Objetivo</span><strong>{brl(goal.targetAmount)}</strong></div>
            </div>

            <div className="planning-goal-meta">
              <div><span>Data objetivo</span><strong>{shortDate(goal.targetDate)}</strong></div>
              <div><span>Aporte planejado</span><strong>{goal.monthlyAmount > 0 ? `${brl(goal.monthlyAmount)}/mês` : 'Não definido'}</strong></div>
              <div><span>Aporte ideal</span><strong>{info.remaining <= 0 ? 'Concluída' : info.availableMonths > 0 ? `${brl(info.idealMonthly)}/mês` : 'Prazo vencido'}</strong></div>
              <div><span>Previsão</span><strong>{info.estimatedDate ? shortDate(info.estimatedDate) : info.remaining <= 0 ? 'Concluída' : 'Sem previsão'}</strong></div>
            </div>

            {info.status === 'attention' && <div className="planning-goal-note warning-note">Para cumprir o prazo, aproxime o aporte mensal de {brl(info.idealMonthly)}.</div>}
            {info.status === 'overdue' && <div className="planning-goal-note bad-note">O prazo terminou. Atualize a data objetivo ou conclua o valor restante.</div>}
            {info.status === 'unplanned' && <div className="planning-goal-note neutral-note">Defina um aporte mensal para gerar uma previsão de conclusão.</div>}
            {info.status === 'completed' && <div className="planning-goal-note good-note">Objetivo alcançado. Esta meta está 100% concluída.</div>}

            <div className="planning-month-row"><span>Aportado neste mês</span><strong>{brl(contributionThisMonth)}</strong></div>

            <div className="planning-goal-actions">
              <button className="primary-btn" disabled={info.status === 'completed'} onClick={() => openContribution(goal)}><Plus size={15}/> Adicionar aporte</button>
              <button className="secondary-btn" onClick={() => setHistoryGoal(goal)}><History size={15}/> Histórico {contributionCount > 0 ? `(${contributionCount})` : ''}</button>
            </div>
          </article>
        })}</div>}

    {open && <Modal title={editing ? 'Editar meta' : 'Nova meta'} onClose={() => { if (!saving) setOpen(false) }}>
      <form className="form-grid" onSubmit={submit}>
        <label className="span-2">Nome<input maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required/></label>
        <label className="span-2">Descrição<input maxLength={500} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })}/></label>
        <label>Valor objetivo<input type="number" min="0.01" max="999999999999.99" step="0.01" value={form.targetAmount} onChange={(event) => setForm({ ...form, targetAmount: event.target.value })} required/></label>
        {!editing
          ? <label>Valor inicial guardado<input type="number" min="0" step="0.01" value={form.savedAmount} onChange={(event) => setForm({ ...form, savedAmount: event.target.value })}/></label>
          : <div className="goal-edit-balance"><span>Acumulado atual</span><strong>{brl(editing.savedAmount)}</strong><small>Para alterar o acumulado, registre ou remova um aporte.</small></div>}
        <label>Guardar por mês<input type="number" min="0" step="0.01" value={form.monthlyAmount} onChange={(event) => setForm({ ...form, monthlyAmount: event.target.value })}/></label>
        <label>Data objetivo<input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} required/></label>
        {formError && <div className="form-error span-2">{formError}</div>}
        <div className="form-actions span-2"><button type="button" className="secondary-btn" disabled={saving} onClick={() => setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button></div>
      </form>
    </Modal>}

    {contributionGoal && <Modal title={`Adicionar aporte · ${contributionGoal.name}`} onClose={() => { if (!savingContribution) setContributionGoal(null) }}>
      <form className="form-grid" onSubmit={submitContribution}>
        <div className="contribution-balance span-2"><div><span>Guardado</span><strong>{brl(contributionGoal.savedAmount)}</strong></div><div><span>Falta</span><strong>{brl(Math.max(0, contributionGoal.targetAmount - contributionGoal.savedAmount))}</strong></div></div>
        <label>Valor do aporte<input autoFocus type="number" min="0.01" max={Math.max(0, contributionGoal.targetAmount - contributionGoal.savedAmount)} step="0.01" value={contributionForm.amount} onChange={(event) => setContributionForm({ ...contributionForm, amount: event.target.value })} required/></label>
        <label>Data<input type="date" max={localDateISO()} value={contributionForm.date} onChange={(event) => setContributionForm({ ...contributionForm, date: event.target.value })} required/></label>
        <label className="span-2">Observação<textarea maxLength={300} placeholder="Ex.: aporte mensal, valor extra..." value={contributionForm.notes} onChange={(event) => setContributionForm({ ...contributionForm, notes: event.target.value })}/></label>
        {contributionError && <div className="form-error span-2">{contributionError}</div>}
        <div className="form-actions span-2"><button type="button" className="secondary-btn" disabled={savingContribution} onClick={() => setContributionGoal(null)}>Cancelar</button><button className="primary-btn" disabled={savingContribution}>{savingContribution ? 'Registrando...' : 'Registrar aporte'}</button></div>
      </form>
    </Modal>}

    {visibleHistoryGoal && <Modal title={`Histórico · ${visibleHistoryGoal.name}`} onClose={() => setHistoryGoal(null)}>
      {(() => {
        const items = contributionsFor(visibleHistoryGoal.id)
        const recorded = items.reduce((sum, item) => sum + item.amount, 0)
        const initial = Math.max(0, visibleHistoryGoal.savedAmount - recorded)
        return <div className="goal-history">
          <div className="goal-history-summary">
            <div><span>Acumulado atual</span><strong>{brl(visibleHistoryGoal.savedAmount)}</strong></div>
            <div><span>Aportes registrados</span><strong>{brl(recorded)}</strong></div>
          </div>
          {initial > 0.005 && <div className="goal-history-note"><Clock3 size={15}/><span>{brl(initial)} correspondem ao valor inicial ou a ajustes anteriores ao histórico de aportes.</span></div>}
          {items.length === 0
            ? <EmptyState text="Nenhum aporte registrado nesta meta ainda."/>
            : <div className="goal-history-list">{items.map((item) => <div className="goal-history-row" key={item.id}>
                <div className="goal-history-icon"><TrendingUp size={16}/></div>
                <div className="grow"><strong>{brl(item.amount)}</strong><span>{shortDate(item.date)}{item.notes ? ` · ${item.notes}` : ''}</span></div>
                <button className="icon-btn danger-text" aria-label="Remover aporte" onClick={() => setContributionDeleteTarget(item)}><Trash2 size={15}/></button>
              </div>)}</div>}
        </div>
      })()}
    </Modal>}

    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Excluir meta?"
      message={deleteTarget ? `A meta “${deleteTarget.name}” e o histórico de aportes dela serão removidos permanentemente.` : ''}
      confirmLabel="Excluir"
      loading={deleting}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />

    <ConfirmDialog
      open={Boolean(contributionDeleteTarget)}
      title="Remover aporte?"
      message={contributionDeleteTarget ? `O aporte de ${brl(contributionDeleteTarget.amount)} será removido e descontado do valor acumulado da meta.` : ''}
      confirmLabel="Remover"
      loading={deletingContribution}
      onClose={() => setContributionDeleteTarget(null)}
      onConfirm={confirmContributionDelete}
    />
  </div>
}

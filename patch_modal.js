const fs = require('fs');
const file = 'components/TaskDetailModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Edit 1: state
code = code.replace(
  `const [dueDate, setDueDate] = useState<number | undefined>(undefined);`,
  `const [dueDate, setDueDate] = useState<number | undefined>(undefined);\n  const [timerDirection, setTimerDirection] = useState<'down' | 'up'>('down');`
);

// Edit 2: initializedForId useEffect
code = code.replace(
  `      setDueDate(todo.dueDate);
      setStatus(todo.status);
      setInitializedForId(todo._id);`,
  `      setTimerDirection(todo.timerDirection || (todo.timerDuration ? 'down' : 'down'));
      setDueDate(todo.dueDate);
      setStatus(todo.status);
      setInitializedForId(todo._id);`
);

// Edit 3: visible && !todoId useEffect
code = code.replace(
  `      setNewSubtaskText("");
      setIsEditingTimer(false);
      setInitializedForId(null);`,
  `      setNewSubtaskText("");
      setIsEditingTimer(false);
      setTimerDirection('down');
      setInitializedForId(null);`
);

// Edit 4: handleClose addTodo
code = code.replace(
  `        ...(projectId ? { projectId } : {}),
        ...(ms > 0 ? { timerDuration: ms } : {}),
        ...(status === 'in_progress' ? { timerStartTime: Date.now() } : {})`,
  `        ...(projectId ? { projectId } : {}),
        ...((ms > 0 && timerDirection === 'down') ? { timerDuration: ms } : {}),
        ...(timerDirection === 'up' ? { timerDirection: 'up', timerDuration: 0 } : { timerDirection: 'down' }),
        ...(status === 'in_progress' ? { timerStartTime: Date.now() } : {})`
);

// Edit 5: createDraftTask signature and addTodo
code = code.replace(
  `  const createDraftTask = async (overrides?: { priority?: string, status?: string }) => {`,
  `  const createDraftTask = async (overrides?: { priority?: string, status?: string, timerDirection?: 'up'|'down' }) => {`
);

code = code.replace(
  `    const draftStatus = overrides?.status || status;
    const draftPriority = overrides?.priority || priority;

    const newId = await addTodo({
      userId,
      text: editText.trim(),
      description: description.trim(),
      priority: draftPriority,
      date: initialDate || Date.now(),
      dueDate: dueDate,
      status: draftStatus,
      ...(projectId ? { projectId } : {}),
      ...(ms > 0 ? { timerDuration: ms } : {}),
      ...(draftStatus === 'in_progress' ? { timerStartTime: Date.now() } : {})
    });`,
  `    const draftStatus = overrides?.status || status;
    const draftPriority = overrides?.priority || priority;
    const draftTimerDir = overrides?.timerDirection || timerDirection;

    const newId = await addTodo({
      userId,
      text: editText.trim(),
      description: description.trim(),
      priority: draftPriority,
      date: initialDate || Date.now(),
      dueDate: dueDate,
      status: draftStatus,
      ...(projectId ? { projectId } : {}),
      ...((ms > 0 && draftTimerDir === 'down') ? { timerDuration: ms } : {}),
      ...(draftTimerDir === 'up' ? { timerDirection: 'up', timerDuration: 0 } : { timerDirection: 'down' }),
      ...(draftStatus === 'in_progress' ? { timerStartTime: Date.now() } : {})
    });`
);

// Edit 6: handleSaveCustomTimer
code = code.replace(
  `  const handleSaveCustomTimer = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (currentTodoId) {
      setTimer({ id: currentTodoId, duration: ms });
    }
    setIsEditingTimer(false);
  };`,
  `  const handleSaveCustomTimer = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const ms = (h * 3600 + m * 60) * 1000;
    if (currentTodoId) {
      setTimer({ id: currentTodoId, duration: ms, timerDirection: 'down' });
    }
    setTimerDirection('down');
    setIsEditingTimer(false);
  };`
);

// Edit 7: Timer Section Selection
code = code.replace(
  `              {/* Timer Section Selection */}
              {(!todo || !todo.timerDuration) && !isEditingTimer && (
                <View style={[styles.section]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>
                  <TouchableOpacity 
                    style={[styles.deadlineButton, { borderColor: projectColor + '60', backgroundColor: projectColor + '10' }]}
                    onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setIsEditingTimer(true);
                    }}
                  >
                    <Ionicons name="timer-outline" size={20} color={projectColor} />
                    <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                      {isArabic ? 'إضافة مؤقت' : 'Add a Timer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}`,
  `              {/* Timer Section Selection */}
              {(!todo || (!todo.timerDuration && todo.timerDirection !== 'up')) && !isEditingTimer && timerDirection !== 'up' && (
                <View style={[styles.section]}>
                  <Text style={[styles.sectionLabel, { color: colors.surfaceText }]}>{t.timer}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity 
                      style={[styles.deadlineButton, { flex: 1, borderColor: projectColor + '60', backgroundColor: projectColor + '10' }]}
                      onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTimerDirection('down');
                          setIsEditingTimer(true);
                      }}
                    >
                      <Ionicons name="timer-outline" size={20} color={projectColor} />
                      <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                        {isArabic ? 'عد تنازلي' : 'Count Down'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.deadlineButton, { flex: 1, borderColor: projectColor + '60', backgroundColor: projectColor + '10' }]}
                      onPress={async () => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTimerDirection('up');
                          if (currentTodoId) {
                            setTimer({ id: currentTodoId, duration: 0, timerDirection: 'up' });
                          } else if (editText.trim() && userId) {
                            await createDraftTask({ timerDirection: 'up' });
                          }
                      }}
                    >
                      <Ionicons name="stopwatch-outline" size={20} color={projectColor} />
                      <Text style={[styles.deadlineButtonText, { color: colors.text, fontWeight: '700' }]}>
                        {isArabic ? 'عد تصاعدي' : 'Count Up'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}`
);

// Edit 8: Circular Timer Visualization
code = code.replace(
  `              {/* Circular Timer Visualization */}
              {(() => {
                const draftTimerDuration = (!currentTodoId) ? ((parseInt(hours) || 0) * 3600000 + (parseInt(minutes) || 0) * 60000) : 0;
                const activeTimerDuration = todo?.timerDuration || draftTimerDuration;
                
                if (!activeTimerDuration || isEditingTimer) return null;
                
                const displayStatus = todo?.status || status;
                const displayTimeLeft = currentTodoId ? timeLeft : activeTimerDuration;`,
  `              {/* Circular Timer Visualization */}
              {(() => {
                const draftTimerDuration = (!currentTodoId) ? ((parseInt(hours) || 0) * 3600000 + (parseInt(minutes) || 0) * 60000) : 0;
                const activeTimerDuration = todo?.timerDuration || draftTimerDuration;
                const isCountUp = todo ? todo.timerDirection === 'up' : timerDirection === 'up';
                
                if ((!activeTimerDuration && !isCountUp) || isEditingTimer) return null;
                
                const displayStatus = todo?.status || status;
                const displayTimeLeft = currentTodoId ? timeLeft : (isCountUp ? 0 : activeTimerDuration);`
);

code = code.replace(
  `                          strokeDasharray={\`\${(displayTimeLeft / (activeTimerDuration || 1)) * 565}, 565\`}
                          strokeLinecap="round"`,
  `                          strokeDasharray={isCountUp ? "565, 565" : \`\${(displayTimeLeft / (activeTimerDuration || 1)) * 565}, 565\`}
                          strokeLinecap="round"`
);

code = code.replace(
  `                      {/* Time Text */}
                      <SvgText
                        x="110"
                        y="105"
                        fontSize="48"
                        fontWeight="900"
                        fill={colors.text}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {\`\${Math.floor(displayTimeLeft / 60000)}:\${String(Math.floor((displayTimeLeft % 60000) / 1000)).padStart(2, '0')}\`}
                      </SvgText>`,
  `                      {/* Time Text */}
                      <SvgText
                        x="110"
                        y="105"
                        fontSize="48"
                        fontWeight="900"
                        fill={colors.text}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                      >
                        {(() => {
                          const h = Math.floor(displayTimeLeft / 3600000);
                          const m = Math.floor((displayTimeLeft % 3600000) / 60000);
                          const s = Math.floor((displayTimeLeft % 60000) / 1000);
                          return h > 0 ? \`\${h}:\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}\` : \`\${m}:\${String(s).padStart(2, '0')}\`;
                        })()}
                      </SvgText>`
);

// Edit 9: removeTimer clear timerDirection
code = code.replace(
  `                          if (currentTodoId) removeTimer({ id: currentTodoId });
                          else {
                            setHours("0");
                            setMinutes("0");
                          }
                          setIsEditingTimer(false);`,
  `                          if (currentTodoId) removeTimer({ id: currentTodoId });
                          else {
                            setHours("0");
                            setMinutes("0");
                            setTimerDirection('down');
                          }
                          setIsEditingTimer(false);`
);

// Verify everything worked
fs.writeFileSync(file, code);
console.log('Patch applied to TaskDetailModal.tsx');

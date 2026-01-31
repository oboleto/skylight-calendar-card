class SkylightCalendarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._events = [];
    this._currentDate = new Date();
    this._viewMode = 'month'; // 'month', 'week-compact', or 'week-standard'
    this._weekStart = new Date();
    this._fetching = false;
    this._lastFetch = null;
    this._hiddenCalendars = new Set(); // Track which calendars are hidden
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error('You need to define calendar entities');
    }
    this._config = {
      title: config.title || 'Family Calendar',
      entities: config.entities,
      showWeekNumbers: config.show_week_numbers !== false,
      firstDayOfWeek: config.first_day_of_week || 0, // 0 = Sunday
      colors: config.colors || {},
      maxEvents: config.max_events || 100,
      view_mode: config.view_mode || 'month', // 'month', 'week-compact', 'week-standard'
      default_view: config.default_view || config.view_mode || 'month', // Default view on load
      week_days: config.week_days || [0, 1, 2, 3, 4, 5, 6], // Which days to show in week view
      rolling_days: config.rolling_days || null, // If set, show current day + N days instead of week_days
      week_start_hour: config.week_start_hour || 8, // Start hour for week-standard view
      week_end_hour: config.week_end_hour || 21, // End hour for week-standard view (9pm)
      compact_height: config.compact_height || false, // Fit to screen height
      height_scale: config.height_scale || 1.0, // Scale factor for height (0.5 = 50%, 2.0 = 200%)
      compact_header: config.compact_header || false, // Compact header layout
      header_color: config.header_color !== undefined ? config.header_color : 'var(--primary-color)', // Custom header background color/gradient
      ...config
    };
    this._viewMode = this._config.default_view;
    this.setWeekStart();
    this.render();
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    
    // Only fetch events if this is the first time or entities changed
    if (!oldHass || !this._lastFetch || Date.now() - this._lastFetch > 60000) {
      this.updateEvents();
    }
  }

  async updateEvents() {
    if (!this._hass || this._fetching) return;
    
    this._fetching = true;
    this._lastFetch = Date.now();
    const newEvents = [];
    
    // Get date range for fetching events
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days ago
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60); // 60 days from now
    
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();
    
    // Fetch events for each calendar
    for (let i = 0; i < this._config.entities.length; i++) {
      const entityId = this._config.entities[i];
      
      try {
        // Use WebSocket API to get calendar events
        const events = await this._hass.callWS({
          type: 'calendar/event/list',
          entity_id: entityId,
          start_date_time: startStr,
          end_date_time: endStr
        });
        
        if (events && Array.isArray(events)) {
          events.forEach(event => {
            newEvents.push({
              ...event,
              entityId,
              color: this._config.colors[entityId] || this.getDefaultColor(i)
            });
          });
        }
      } catch (error) {
        console.error(`Failed to fetch events for ${entityId}:`, error);
        console.log('Trying alternative method...');
        
        // Fallback: try the REST API
        try {
          const startDateOnly = startDate.toISOString().split('T')[0];
          const endDateOnly = endDate.toISOString().split('T')[0];
          const events = await this._hass.callApi('GET', `calendars/${entityId}?start=${startDateOnly}T00:00:00Z&end=${endDateOnly}T23:59:59Z`);
          
          if (events && Array.isArray(events)) {
            events.forEach(event => {
              newEvents.push({
                ...event,
                entityId,
                color: this._config.colors[entityId] || this.getDefaultColor(i)
              });
            });
          }
        } catch (error2) {
          console.error(`Alternative method also failed for ${entityId}:`, error2);
        }
      }
    }
    
    newEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    this._events = newEvents;
    this._fetching = false;
    this.render();
  }

  getDefaultColor(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[index % colors.length];
  }

  connectedCallback() {
    this.render();
  }

  setWeekStart() {
    const date = new Date(this._currentDate);
    const day = date.getDay();
    const diff = (day - this._config.firstDayOfWeek + 7) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    this._weekStart = date;
  }

  getWeekDays() {
    // If rolling_days is set, show current date + N days
    if (this._config.rolling_days !== null) {
      const days = [];
      const startDate = new Date(this._currentDate);
      startDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i <= this._config.rolling_days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        days.push(date);
      }
      return days;
    }
    
    // Otherwise use the week-based approach
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this._weekStart);
      date.setDate(this._weekStart.getDate() + i);
      if (this._config.week_days.includes(date.getDay())) {
        days.push(date);
      }
    }
    return days;
  }

  getStyles() {
    return `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        width: 100%;
      }
      
      .calendar-container {
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        width: 100%;
      }
      
      .header {
        background: var(--header-background);
        color: white;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .header-compact {
        padding: 16px 24px;
      }
      
      .compact-header-left {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      
      .calendar-badges-inline {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .calendar-badge-inline {
        padding: 6px 12px !important;
        font-size: 12px !important;
      }
      
      .calendar-badge-inline .calendar-badge-icon {
        width: 20px !important;
        height: 20px !important;
        font-size: 10px !important;
      }
      
      .calendar-badge-inline .calendar-badge-name {
        font-size: 12px;
      }
      
      .header-title {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
      }
      
      .header-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .view-mode-buttons {
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.15);
        padding: 4px;
        border-radius: 8px;
      }
      
      .view-mode-button {
        background: transparent;
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.2s;
      }
      
      .view-mode-button:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .view-mode-button.active {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .nav-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .nav-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .today-button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }
      
      .today-button:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .month-year {
        font-size: 18px;
        font-weight: 500;
        color: white;
        min-width: 180px;
        text-align: center;
      }
      
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background: #e5e7eb;
        border-top: 1px solid #e5e7eb;
      }
      
      .day-header {
        background: #f9fafb;
        padding: 12px 8px;
        text-align: center;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        color: #6b7280;
        letter-spacing: 0.5px;
      }
      
      .day-cell {
        background: white;
        min-height: 100px;
        padding: 8px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .day-cell:hover {
        background: #f9fafb;
      }
      
      .day-cell.other-month {
        background: #fafafa;
        opacity: 0.5;
      }
      
      .day-cell.today {
        background: #eff6ff;
      }
      
      .day-number {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
      }
      
      .day-cell.today .day-number {
        background: #3b82f6;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 4px;
      }
      
      .event {
        background: #3b82f6;
        color: white;
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 11px;
        margin-bottom: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        font-weight: 500;
      }
      
      .event:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .event-time {
        font-size: 10px;
        opacity: 0.9;
        margin-right: 4px;
      }
      
      .more-events {
        font-size: 10px;
        color: #6b7280;
        margin-top: 2px;
        font-weight: 500;
      }
      
      /* Week Compact View Styles */
      .week-compact-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1px;
        background: #e5e7eb;
        border-top: 1px solid #e5e7eb;
      }
      
      .week-day-column {
        background: white;
        padding: 16px 12px;
        min-height: 200px;
      }
      
      .week-day-header {
        text-align: center;
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      .week-day-name {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #6b7280;
        letter-spacing: 0.5px;
      }
      
      .week-day-date {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-top: 4px;
      }
      
      .week-day-column.today .week-day-header {
        border-bottom-color: #3b82f6;
      }
      
      .week-day-column.today .week-day-date {
        color: #3b82f6;
      }
      
      .week-compact-event {
        background: #3b82f6;
        color: white;
        padding: 8px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .week-compact-event:hover {
        transform: translateX(2px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      
      .week-compact-event-time {
        font-size: 11px;
        font-weight: 600;
        opacity: 0.9;
        margin-bottom: 4px;
      }
      
      .week-compact-event-title {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
      }
      
      /* Week Standard View Styles */
      .calendar-badges {
        padding: 16px 24px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        background: white;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .calendar-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        border: 2px solid;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
      }
      
      .calendar-badge:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .calendar-badge-hidden {
        opacity: 0.5;
      }
      
      .calendar-badge-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: 600;
      }
      
      .calendar-badge-name {
        color: #374151;
      }
      
      .week-standard-container {
        display: flex;
        background: #f9fafb;
        overflow-x: auto;
        padding: 16px;
        gap: 12px;
        width: 100%;
        box-sizing: border-box;
      }
      
      .time-column {
        min-width: 60px;
        flex-shrink: 0;
        position: relative;
      }
      
      .time-column-header-spacer {
        height: 60px;
        background: transparent;
        flex-shrink: 0;
      }
      
      .time-column-allday-spacer {
        padding: 8px;
        background: transparent;
        border-bottom: 2px solid transparent;
        flex-shrink: 0;
        box-sizing: border-box;
      }
      
      .time-column-extra-spacer {
        height: 35px;
        background: transparent;
        flex-shrink: 0;
      }
      
      .time-slot {
        height: 120px;
        font-size: 11px;
        color: #9ca3af;
        text-align: right;
        font-weight: 500;
        position: relative;
        padding-right: 8px;
        display: flex;
        align-items: flex-start;
        padding-top: 0;
        box-sizing: border-box;
        border-top: 1px solid transparent;
      }
      
      .time-slot-label {
        position: absolute;
        top: -6px;
        right: 8px;
        line-height: 1;
      }
      
      .week-standard-day-column {
        flex: 1;
        min-width: 140px;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .week-standard-day-header {
        padding: 16px;
        text-align: center;
        border-bottom: 1px solid #e5e7eb;
        background: white;
      }
      
      .week-standard-day-name {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #6b7280;
        letter-spacing: 0.5px;
      }
      
      .week-standard-day-date {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-top: 4px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .week-standard-day-column.today .week-standard-day-date {
        background: #3b82f6;
        color: white;
        border-radius: 50%;
      }
      
      .day-time-slots {
        position: relative;
        min-height: 600px;
      }
      
      .all-day-events {
        padding: 8px;
        background: #f9fafb;
        border-bottom: 2px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 4px;
        box-sizing: border-box;
      }
      
      .all-day-event {
        padding: 4px 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        font-size: 11px;
        flex-shrink: 0;
        height: 24px;
        display: flex;
        align-items: center;
        box-sizing: border-box;
      }
      
      .all-day-event:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      
      .all-day-event-title {
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #1f2937;
      }
      
      .day-time-slot {
        height: 120px;
        border-top: 1px solid #f3f4f6;
        position: relative;
        box-sizing: border-box;
      }
      
      .week-standard-event {
        position: absolute;
        left: 8px;
        right: 8px;
        color: #1f2937;
        padding: 6px 8px;
        border-radius: 8px;
        font-size: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 1;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        box-sizing: border-box;
      }
      
      .week-standard-event:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10;
      }
      
      .week-standard-event-title {
        font-weight: 600;
        margin-bottom: 4px;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .week-standard-event-time {
        font-size: 11px;
        font-weight: 500;
        opacity: 0.85;
      }
      
      .week-standard-event-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        float: right;
        margin-left: 8px;
      }
      
      .event-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
      }
      
      .event-modal.show {
        display: flex;
      }
      
      .modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 16px;
      }
      
      .modal-title {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .modal-close:hover {
        background: #f3f4f6;
      }
      
      .modal-body {
        color: #374151;
      }
      
      .modal-row {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 14px;
      }
      
      .modal-label {
        font-weight: 600;
        min-width: 80px;
        color: #6b7280;
      }
      
      .modal-value {
        flex: 1;
      }
      
      .empty-state {
        padding: 40px 24px;
        text-align: center;
        color: #6b7280;
      }
      
      .empty-state-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .empty-state-text {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
      }
      
      .empty-state-subtext {
        font-size: 14px;
        opacity: 0.8;
      }
      
      @media (max-width: 768px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        
        .header-controls {
          justify-content: space-between;
        }
        
        .month-year {
          min-width: auto;
        }
        
        .week-standard-container {
          font-size: 10px;
        }
        
        .week-standard-day-date {
          font-size: 14px;
        }
      }
    `;
  }

  render() {
    const today = new Date();
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();

    const headerColorStyle = this._config.header_color 
      ? `--header-background: ${this._config.header_color};` 
      : '';
    
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      
      <div class="calendar-container" style="${headerColorStyle}">
        ${this._config.compact_header ? this.renderCompactHeader() : this.renderStandardHeader()}
        
        ${this.renderCalendarView()}
      </div>
      
      <div class="event-modal" id="event-modal">
        <div class="modal-content" id="modal-content">
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderStandardHeader() {
    return `
      <div class="header">
        <h2 class="header-title">${this._config.title}</h2>
        <div class="header-controls">
          ${this.renderViewModeButtons()}
          <button class="nav-button" id="prev-period">‹</button>
          <div class="month-year">${this.getPeriodLabel()}</div>
          <button class="nav-button" id="next-period">›</button>
          <button class="today-button" id="today">Today</button>
        </div>
      </div>
    `;
  }

  renderCompactHeader() {
    return `
      <div class="header header-compact">
        <div class="compact-header-left">
          <h2 class="header-title">${this._config.title}</h2>
          ${this._viewMode === 'week-standard' ? this.renderCalendarBadgesInline() : ''}
        </div>
        <div class="header-controls">
          ${this.renderViewModeButtons()}
          <button class="nav-button" id="prev-period">‹</button>
          <div class="month-year">${this.getPeriodLabel()}</div>
          <button class="nav-button" id="next-period">›</button>
          <button class="today-button" id="today">Today</button>
        </div>
      </div>
    `;
  }

  renderCalendarBadgesInline() {
    if (!this._config.entities || this._config.entities.length === 0) return '';
    
    return `
      <div class="calendar-badges-inline">
        ${this._config.entities.map((entityId, index) => {
          const entity = this._hass?.states[entityId];
          const name = entity?.attributes?.friendly_name || entityId.split('.')[1];
          const color = this._config.colors[entityId] || this.getDefaultColor(index);
          const initial = name.charAt(0).toUpperCase();
          const isHidden = this._hiddenCalendars.has(entityId);
          
          return `
            <div class="calendar-badge calendar-badge-inline ${isHidden ? 'calendar-badge-hidden' : ''}" 
                 data-entity="${entityId}"
                 style="background: ${isHidden ? '#f3f4f6' : this.lightenColor(color, 0.85)}; 
                        border-color: ${isHidden ? '#d1d5db' : color};">
              <div class="calendar-badge-icon" style="background: ${isHidden ? '#9ca3af' : color}">${initial}</div>
              <span class="calendar-badge-name" style="color: ${isHidden ? '#9ca3af' : '#374151'}">${this.escapeHtml(name)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderViewModeButtons() {
    return `
      <div class="view-mode-buttons">
        <button class="view-mode-button ${this._viewMode === 'month' ? 'active' : ''}" data-view="month">Month</button>
        <button class="view-mode-button ${this._viewMode === 'week-compact' ? 'active' : ''}" data-view="week-compact">Week</button>
        <button class="view-mode-button ${this._viewMode === 'week-standard' ? 'active' : ''}" data-view="week-standard">Schedule</button>
      </div>
    `;
  }

  getPeriodLabel() {
    if (this._viewMode === 'month') {
      const month = this._currentDate.getMonth();
      const year = this._currentDate.getFullYear();
      return `${this.getMonthName(month)} ${year}`;
    } else {
      const weekDays = this.getWeekDays();
      if (weekDays.length === 0) return '';
      const start = weekDays[0];
      const end = weekDays[weekDays.length - 1];
      if (start.getMonth() === end.getMonth()) {
        return `${this.getMonthName(start.getMonth())} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${this.getMonthName(start.getMonth())} ${start.getDate()} - ${this.getMonthName(end.getMonth())} ${end.getDate()}, ${start.getFullYear()}`;
      }
    }
  }

  renderCalendarView() {
    if (this._viewMode === 'month') {
      return `
        <div class="calendar-grid">
          ${this.renderDayHeaders()}
          ${this.renderDays()}
        </div>
      `;
    } else if (this._viewMode === 'week-compact') {
      return this.renderWeekCompact();
    } else if (this._viewMode === 'week-standard') {
      return this.renderWeekStandard();
    }
  }

  renderDayHeaders() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const firstDay = this._config.firstDayOfWeek;
    const orderedDays = [...days.slice(firstDay), ...days.slice(0, firstDay)];
    
    return orderedDays.map(day => `
      <div class="day-header">${day}</div>
    `).join('');
  }

  renderWeekCompact() {
    const weekDays = this.getWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return `
      <div class="week-compact-container">
        ${weekDays.map(date => {
          const isToday = date.toDateString() === today.toDateString();
          let events = this.getEventsForDay(date);
          
          // Sort events: all-day first, then by start time
          events = events.sort((a, b) => {
            const aIsAllDay = a.start.date || !a.start.includes?.('T');
            const bIsAllDay = b.start.date || !b.start.includes?.('T');
            
            // All-day events come first
            if (aIsAllDay && !bIsAllDay) return -1;
            if (!aIsAllDay && bIsAllDay) return 1;
            
            // Both same type, sort by time
            const aTime = new Date(a.start.dateTime || a.start.date || a.start);
            const bTime = new Date(b.start.dateTime || b.start.date || b.start);
            return aTime - bTime;
          });
          
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          
          return `
            <div class="week-day-column ${isToday ? 'today' : ''}">
              <div class="week-day-header">
                <div class="week-day-name">${dayNames[date.getDay()]}</div>
                <div class="week-day-date">${date.getDate()}</div>
              </div>
              <div class="week-day-events">
                ${events.map(event => {
                  let startTime, isAllDay;
                  
                  if (event.start.dateTime) {
                    startTime = new Date(event.start.dateTime);
                    isAllDay = false;
                  } else if (event.start.date) {
                    startTime = new Date(event.start.date);
                    isAllDay = true;
                  } else {
                    startTime = new Date(event.start);
                    isAllDay = !event.start.includes('T');
                  }
                  
                  return `
                    <div class="week-compact-event" style="background: ${event.color}" data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
                      ${!isAllDay ? `<div class="week-compact-event-time">${this.formatTime(startTime)}</div>` : '<div class="week-compact-event-time">All Day</div>'}
                      <div class="week-compact-event-title">${this.escapeHtml(event.summary || 'Untitled Event')}</div>
                    </div>
                  `;
                }).join('')}
                ${events.length === 0 ? '<div style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 20px;">No events</div>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderWeekStandard() {
    const weekDays = this.getWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startHour = this._config.week_start_hour;
    const endHour = this._config.week_end_hour;
    const hours = [];
    
    for (let h = startHour; h <= endHour; h++) {
      hours.push(h);
    }
    
    const baseHourHeight = 120;
    const hourHeight = baseHourHeight * (this._config.height_scale || 1.0);
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const containerStyle = this._config.compact_height 
      ? 'max-height: calc(100vh - 200px); overflow-y: auto;' 
      : '';
    
    // Calculate max all-day events across all days
    let maxAllDayEvents = 0;
    weekDays.forEach(date => {
      const dayEvents = this.getEventsForDay(date);
      const allDayCount = dayEvents.filter(event => {
        if (this._hiddenCalendars.has(event.entityId)) return false;
        if (event.start.date) return true;
        if (event.start.dateTime) return false;
        return !event.start.includes('T');
      }).length;
      maxAllDayEvents = Math.max(maxAllDayEvents, allDayCount);
    });
    
    const hasAllDayEvents = maxAllDayEvents > 0;
    // Calculate height: 16px padding + events×24px + gaps×4px + 2px border
    // gaps = events - 1 (no gap after last event)
    const allDayHeight = hasAllDayEvents 
      ? 16 + (maxAllDayEvents * 24) + ((maxAllDayEvents - 1) * 4) + 2
      : 0;
    
    return `
      ${!this._config.compact_header ? this.renderCalendarBadges() : ''}
      <div class="week-standard-container" style="${containerStyle}">
        <!-- Time column -->
        <div class="time-column">
          <div class="time-column-header-spacer"></div>
          ${hasAllDayEvents ? `<div class="time-column-allday-spacer" style="height: ${allDayHeight}px;"></div>` : ''}
          <div class="time-column-extra-spacer"></div>
          ${hours.map(hour => `
            <div class="time-slot" style="height: ${hourHeight}px;">
              <span class="time-slot-label">${this.formatHour(hour)}</span>
            </div>
          `).join('')}
        </div>
        
        <!-- Day columns -->
        ${weekDays.map(date => {
          const isToday = date.toDateString() === today.toDateString();
          const dayEvents = this.getEventsForDay(date);
          
          return `
            <div class="week-standard-day-column ${isToday ? 'today' : ''}">
              <div class="week-standard-day-header">
                <div class="week-standard-day-name">${dayNames[date.getDay()]}</div>
                <div class="week-standard-day-date">${date.getDate()}</div>
              </div>
              ${hasAllDayEvents ? this.renderAllDayEventsForDay(dayEvents, allDayHeight) : ''}
              <div class="day-time-slots">
                ${hours.map(hour => `
                  <div class="day-time-slot" style="height: ${hourHeight}px;"></div>
                `).join('')}
                ${this.renderTimedEventsForDay(dayEvents, date, startHour, endHour, hourHeight)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderCalendarBadges() {
    if (!this._config.entities || this._config.entities.length === 0) return '';
    
    return `
      <div class="calendar-badges">
        ${this._config.entities.map((entityId, index) => {
          const entity = this._hass?.states[entityId];
          const name = entity?.attributes?.friendly_name || entityId.split('.')[1];
          const color = this._config.colors[entityId] || this.getDefaultColor(index);
          const initial = name.charAt(0).toUpperCase();
          const isHidden = this._hiddenCalendars.has(entityId);
          
          return `
            <div class="calendar-badge ${isHidden ? 'calendar-badge-hidden' : ''}" 
                 data-entity="${entityId}"
                 style="background: ${isHidden ? '#f3f4f6' : this.lightenColor(color, 0.85)}; 
                        border-color: ${isHidden ? '#d1d5db' : color};
                        cursor: pointer;">
              <div class="calendar-badge-icon" style="background: ${isHidden ? '#9ca3af' : color}">${initial}</div>
              <span class="calendar-badge-name" style="color: ${isHidden ? '#9ca3af' : '#374151'}">${this.escapeHtml(name)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderAllDayEventsForDay(events, allDayHeight) {
    const allDayEvents = events.filter(event => {
      if (this._hiddenCalendars.has(event.entityId)) {
        return false;
      }
      
      let isAllDay = false;
      
      if (event.start.date) {
        isAllDay = true;
      } else if (event.start.dateTime) {
        isAllDay = false;
      } else {
        isAllDay = !event.start.includes('T');
      }
      
      return isAllDay;
    });
    
    // Always render with the calculated height to keep all days aligned
    return `
      <div class="all-day-events" style="min-height: ${allDayHeight}px; height: ${allDayHeight}px;">
        ${allDayEvents.length > 0 ? allDayEvents.map(event => {
          const bgColor = this.lightenColor(event.color, 0.85);
          return `
            <div class="all-day-event" 
                 style="background: ${bgColor}; border-left: 4px solid ${event.color}"
                 data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
              <div class="all-day-event-title">${this.escapeHtml(event.summary || 'Untitled')}</div>
            </div>
          `;
        }).join('') : ''}
      </div>
    `;
  }

  renderTimedEventsForDay(events, date, startHour, endHour, hourHeight) {
    const timedEvents = events.filter(event => {
      if (this._hiddenCalendars.has(event.entityId)) {
        return false;
      }
      
      let isAllDay = false;
      let eventStart;
      
      if (event.start.dateTime) {
        eventStart = new Date(event.start.dateTime);
        isAllDay = false;
      } else if (event.start.date) {
        return false; // Skip all-day events
      } else {
        eventStart = new Date(event.start);
        isAllDay = !event.start.includes('T');
      }
      
      if (isAllDay) return false;
      
      const eventHour = eventStart.getHours();
      return eventHour >= startHour && eventHour <= endHour;
    });
    
    // Process timed events for overlaps
    const eventBlocks = timedEvents.map(event => {
      let eventStart, eventEnd;
      
      if (event.start.dateTime) {
        eventStart = new Date(event.start.dateTime);
        eventEnd = new Date(event.end.dateTime);
      } else {
        eventStart = new Date(event.start);
        eventEnd = new Date(event.end);
      }
      
      const startHourFloat = eventStart.getHours() + eventStart.getMinutes() / 60;
      const endHourFloat = eventEnd.getHours() + eventEnd.getMinutes() / 60;
      
      return {
        event,
        eventStart,
        eventEnd,
        startHourFloat,
        endHourFloat,
        startMinutes: eventStart.getHours() * 60 + eventStart.getMinutes(),
        endMinutes: eventEnd.getHours() * 60 + eventEnd.getMinutes()
      };
    });
    
    // Sort by start time, then by duration (longer first)
    eventBlocks.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }
      return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
    });
    
    // Detect overlapping events and assign columns
    const columns = [];
    eventBlocks.forEach(block => {
      // Find a column where this event doesn't overlap
      let placed = false;
      for (let col of columns) {
        const overlaps = col.some(other => 
          block.startMinutes < other.endMinutes && block.endMinutes > other.startMinutes
        );
        if (!overlaps) {
          col.push(block);
          block.column = columns.indexOf(col);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([block]);
        block.column = columns.length - 1;
      }
    });
    
    const totalColumns = columns.length;
    
    // Render timed events
    return eventBlocks.map(block => {
      const { event, eventStart, eventEnd, startHourFloat, endHourFloat, column } = block;
      
      const duration = endHourFloat - startHourFloat;
      const top = (startHourFloat - startHour) * hourHeight;
      const height = duration * hourHeight;
      
      // Calculate width and position for concurrent events
      const width = totalColumns > 1 ? `calc((100% - 16px) / ${totalColumns})` : 'calc(100% - 16px)';
      const left = totalColumns > 1 ? `calc(8px + ((100% - 16px) / ${totalColumns}) * ${column})` : '8px';
      
      const bgColor = this.lightenColor(event.color, 0.85);
      
      return `
        <div class="week-standard-event" 
             style="top: ${top}px; height: ${height}px; width: ${width}; left: ${left}; background: ${bgColor}; border-left: 4px solid ${event.color}"
             data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
          <div class="week-standard-event-title">${this.escapeHtml(event.summary || 'Untitled')}</div>
          <div class="week-standard-event-time">${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}</div>
          ${this.renderEventIcon(event)}
        </div>
      `;
    }).join('');
  }

  renderWeekStandardEvents(events, date, startHour, endHour) {
    // This method is kept for backwards compatibility but now calls the split methods
    const hourHeight = 120 * (this._config.height_scale || 1.0);
    return this.renderTimedEventsForDay(events, date, startHour, endHour, hourHeight);
  }

  renderEventIcon(event) {
    // Get the initials or icon based on calendar
    const entityId = event.entityId;
    const entity = this._hass?.states[entityId];
    const name = entity?.attributes?.friendly_name || '';
    const initial = name.charAt(0).toUpperCase();
    
    return `<div class="week-standard-event-icon" style="background: ${event.color}; color: white;">${initial}</div>`;
  }

  lightenColor(color, amount) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Lighten by blending with white
    const nr = Math.round(r + (255 - r) * amount);
    const ng = Math.round(g + (255 - g) * amount);
    const nb = Math.round(b + (255 - b) * amount);
    
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  renderDays() {
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const isToday = (d) => {
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    let html = '';
    const startDay = (firstDay - this._config.firstDayOfWeek + 7) % 7;
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      html += this.renderDay(day, date, true);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      html += this.renderDay(day, date, false);
    }
    
    // Next month days
    const totalCells = startDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      html += this.renderDay(day, date, true);
    }
    
    return html;
  }

  renderDay(dayNum, date, isOtherMonth) {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    let dayEvents = this.getEventsForDay(date);
    
    // Sort events: all-day first, then by start time
    dayEvents = dayEvents.sort((a, b) => {
      const aIsAllDay = a.start.date || !a.start.includes?.('T');
      const bIsAllDay = b.start.date || !b.start.includes?.('T');
      
      // All-day events come first
      if (aIsAllDay && !bIsAllDay) return -1;
      if (!aIsAllDay && bIsAllDay) return 1;
      
      // Both same type, sort by time
      const aTime = new Date(a.start.dateTime || a.start.date || a.start);
      const bTime = new Date(b.start.dateTime || b.start.date || b.start);
      return aTime - bTime;
    });
    
    const maxVisible = 3;
    
    let classes = 'day-cell';
    if (isOtherMonth) classes += ' other-month';
    if (isToday) classes += ' today';
    
    return `
      <div class="${classes}" data-date="${date.toISOString()}">
        <div class="day-number">${dayNum}</div>
        ${dayEvents.slice(0, maxVisible).map(event => this.renderEvent(event)).join('')}
        ${dayEvents.length > maxVisible ? `<div class="more-events">+${dayEvents.length - maxVisible} more</div>` : ''}
      </div>
    `;
  }

  renderEvent(event) {
    let startTime;
    let isAllDay = false;
    
    if (event.start.dateTime) {
      startTime = new Date(event.start.dateTime);
    } else if (event.start.date) {
      startTime = new Date(event.start.date);
      isAllDay = true;
    } else {
      startTime = new Date(event.start);
      isAllDay = !event.start.includes('T');
    }
    
    return `
      <div class="event" style="background: ${event.color}" data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
        ${!isAllDay ? `<span class="event-time">${this.formatTime(startTime)}</span>` : ''}
        ${this.escapeHtml(event.summary || 'Untitled Event')}
      </div>
    `;
  }

  getEventsForDay(date) {
    const dateStr = date.toDateString();
    return this._events.filter(event => {
      // Filter out events from hidden calendars
      if (this._hiddenCalendars.has(event.entityId)) {
        return false;
      }
      
      // Handle both ISO format and HA's datetime format
      let eventStart, eventEnd, isAllDay;
      
      if (event.start.dateTime) {
        // Google Calendar format
        eventStart = new Date(event.start.dateTime);
        eventEnd = new Date(event.end.dateTime);
        isAllDay = false;
      } else if (event.start.date) {
        // All-day event format
        eventStart = new Date(event.start.date + 'T00:00:00');
        eventEnd = new Date(event.end.date + 'T00:00:00');
        isAllDay = true;
      } else {
        // Direct ISO string format
        eventStart = new Date(event.start);
        eventEnd = new Date(event.end);
        isAllDay = !event.start.includes('T');
      }
      
      // Check if the date falls within the event range
      const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // For all-day events, end date is exclusive (event ends at start of end date)
      if (isAllDay) {
        return checkDate >= eventStartDate && checkDate < eventEndDate;
      }
      
      return checkDate >= eventStartDate && checkDate <= eventEndDate;
    });
  }

  attachEventListeners() {
    const prevButton = this.shadowRoot.getElementById('prev-period');
    const nextButton = this.shadowRoot.getElementById('next-period');
    const todayButton = this.shadowRoot.getElementById('today');
    const modal = this.shadowRoot.getElementById('event-modal');
    
    // View mode buttons
    this.shadowRoot.querySelectorAll('.view-mode-button').forEach(button => {
      button.addEventListener('click', () => {
        this._viewMode = button.getAttribute('data-view');
        this._config.view_mode = this._viewMode;
        this.setWeekStart();
        this.render();
      });
    });
    
    // Calendar badge toggle (both regular and inline)
    this.shadowRoot.querySelectorAll('.calendar-badge, .calendar-badge-inline').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const entityId = badge.getAttribute('data-entity');
        if (this._hiddenCalendars.has(entityId)) {
          this._hiddenCalendars.delete(entityId);
        } else {
          this._hiddenCalendars.add(entityId);
        }
        this.render();
      });
    });
    
    prevButton?.addEventListener('click', () => {
      if (this._viewMode === 'month') {
        this._currentDate.setMonth(this._currentDate.getMonth() - 1);
      } else {
        // In rolling_days mode, advance by rolling_days + 1, otherwise by 7
        const daysToAdvance = this._config.rolling_days !== null 
          ? this._config.rolling_days + 1 
          : 7;
        this._currentDate.setDate(this._currentDate.getDate() - daysToAdvance);
        if (this._config.rolling_days === null) {
          this.setWeekStart();
        }
      }
      this._lastFetch = null; // Force refresh
      this.updateEvents();
    });
    
    nextButton?.addEventListener('click', () => {
      if (this._viewMode === 'month') {
        this._currentDate.setMonth(this._currentDate.getMonth() + 1);
      } else {
        // In rolling_days mode, advance by rolling_days + 1, otherwise by 7
        const daysToAdvance = this._config.rolling_days !== null 
          ? this._config.rolling_days + 1 
          : 7;
        this._currentDate.setDate(this._currentDate.getDate() + daysToAdvance);
        if (this._config.rolling_days === null) {
          this.setWeekStart();
        }
      }
      this._lastFetch = null; // Force refresh
      this.updateEvents();
    });
    
    todayButton?.addEventListener('click', () => {
      this._currentDate = new Date();
      if (this._config.rolling_days === null) {
        this.setWeekStart();
      }
      this._lastFetch = null; // Force refresh
      this.updateEvents();
    });
    
    // Event click handlers for all view modes
    this.shadowRoot.querySelectorAll('.event, .week-compact-event, .week-standard-event, .all-day-event').forEach(eventEl => {
      eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const eventData = JSON.parse(eventEl.getAttribute('data-event'));
        this.showEventModal(eventData);
      });
    });
    
    // Day click handlers (month view only)
    this.shadowRoot.querySelectorAll('.day-cell').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const date = new Date(dayEl.getAttribute('data-date'));
        const events = this.getEventsForDay(date);
        if (events.length > 0) {
          this.showDayModal(date, events);
        }
      });
    });
    
    // Modal close
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }

  showEventModal(event) {
    const modal = this.shadowRoot.getElementById('event-modal');
    const content = this.shadowRoot.getElementById('modal-content');
    
    let startDate, endDate, isAllDay;
    
    if (event.start.dateTime) {
      startDate = new Date(event.start.dateTime);
      endDate = new Date(event.end.dateTime);
      isAllDay = false;
    } else if (event.start.date) {
      startDate = new Date(event.start.date);
      endDate = new Date(event.end.date);
      isAllDay = true;
    } else {
      startDate = new Date(event.start);
      endDate = new Date(event.end);
      isAllDay = !event.start.includes('T');
    }
    
    // Get calendar info
    const entity = this._hass?.states[event.entityId];
    const calendarName = entity?.attributes?.friendly_name || event.entityId.split('.')[1];
    
    content.innerHTML = `
      <div class="modal-header">
        <div>
          <h3 class="modal-title">${this.escapeHtml(event.summary || 'Untitled Event')}</h3>
          <div class="modal-calendar-badge" style="background: ${event.color}; color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 8px;">
            ${this.escapeHtml(calendarName)}
          </div>
        </div>
        <button class="modal-close" id="close-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-row">
          <div class="modal-label">📅 Start</div>
          <div class="modal-value">
            ${this.formatDate(startDate)}${!isAllDay ? ` at ${this.formatTime(startDate)}` : ' (All Day)'}
          </div>
        </div>
        <div class="modal-row">
          <div class="modal-label">🏁 End</div>
          <div class="modal-value">
            ${this.formatDate(endDate)}${!isAllDay ? ` at ${this.formatTime(endDate)}` : ' (All Day)'}
          </div>
        </div>
        ${!isAllDay ? `
          <div class="modal-row">
            <div class="modal-label">⏱️ Duration</div>
            <div class="modal-value">${this.formatDuration(startDate, endDate)}</div>
          </div>
        ` : ''}
        ${event.location ? `
          <div class="modal-row">
            <div class="modal-label">📍 Location</div>
            <div class="modal-value">${this.escapeHtml(event.location)}</div>
          </div>
        ` : ''}
        ${event.description ? `
          <div class="modal-row">
            <div class="modal-label">📝 Description</div>
            <div class="modal-value" style="white-space: pre-wrap;">${this.escapeHtml(event.description)}</div>
          </div>
        ` : ''}
        ${event.attendees && event.attendees.length > 0 ? `
          <div class="modal-row">
            <div class="modal-label">👥 Attendees</div>
            <div class="modal-value">
              ${event.attendees.map(a => this.escapeHtml(a.email || a.displayName || 'Unknown')).join(', ')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    modal.classList.add('show');
    
    this.shadowRoot.getElementById('close-modal')?.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }

  showDayModal(date, events) {
    const modal = this.shadowRoot.getElementById('event-modal');
    const content = this.shadowRoot.getElementById('modal-content');
    
    content.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${this.formatDate(date)}</h3>
        <button class="modal-close" id="close-modal">×</button>
      </div>
      <div class="modal-body">
        ${events.map(event => `
          <div style="margin-bottom: 16px; padding: 12px; background: ${event.color}15; border-left: 4px solid ${event.color}; border-radius: 4px; cursor: pointer;" class="day-event" data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'>
            <div style="font-weight: 600; margin-bottom: 4px;">${this.escapeHtml(event.summary || 'Untitled Event')}</div>
            <div style="font-size: 13px; color: #6b7280;">
              ${!event.all_day ? this.formatTime(new Date(event.start)) + ' - ' + this.formatTime(new Date(event.end)) : 'All Day'}
            </div>
            ${event.location ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">📍 ${this.escapeHtml(event.location)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    
    modal.classList.add('show');
    
    this.shadowRoot.getElementById('close-modal')?.addEventListener('click', () => {
      modal.classList.remove('show');
    });
    
    this.shadowRoot.querySelectorAll('.day-event').forEach(el => {
      el.addEventListener('click', () => {
        const eventData = JSON.parse(el.getAttribute('data-event'));
        this.showEventModal(eventData);
      });
    });
  }

  getMonthName(month) {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return names[month];
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatDuration(startDate, endDate) {
    const diffMs = endDate - startDate;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static getStubConfig() {
    return {
      title: 'Family Calendar',
      entities: ['calendar.personal'],
      view_mode: 'month',
      show_week_numbers: false,
      first_day_of_week: 0,
      week_days: [0, 1, 2, 3, 4, 5, 6],
      week_start_hour: 8,
      week_end_hour: 21
    };
  }

  getCardSize() {
    return 6;
  }
}

customElements.define('skylight-calendar-card', SkylightCalendarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'skylight-calendar-card',
  name: 'Skylight Calendar Card',
  description: 'A beautiful calendar card inspired by Skylight Calendar',
  preview: true,
  documentationURL: 'https://github.com/superdingo101/skylight-calendar-card'
});

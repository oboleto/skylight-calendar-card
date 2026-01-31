# Skylight Calendar Card for Home Assistant

A beautiful, customizable calendar card for Home Assistant that mimics the design and functionality of the popular Skylight Calendar. Perfect for families to organize schedules, events, and activities.

<img width="1892" height="892" alt="image" src="https://github.com/user-attachments/assets/4ed9f271-4ac4-45b4-86d7-0afc2246d6db" />


## Features

- 🎨 **Beautiful Design**: Clean, modern interface inspired by Skylight Calendar
- 📅 **Multiple Views**: Month view, compact week view, and schedule week view
- 📆 **Rolling Days Mode**: Show today + N days for flexible date ranges
- 🎯 **Multiple Calendars**: Support for multiple calendar entities with custom colors
- 👁️ **Calendar Filtering**: Click calendar badges to show/hide specific calendars
- 🖱️ **Interactive**: Click on events to view full details in a popup
- 📱 **Responsive**: Works great on desktop, tablet, and mobile
- 🔄 **Real-time Updates**: Automatically syncs with your Home Assistant calendars
- 🎨 **Customizable**: Configure colors, starting day of week, visible days, and more
- 🌈 **Custom Header Colors**: Personalize the banner with solid colors or gradients
- ⏰ **Flexible Schedule**: Customize time range for schedule view (e.g., 8am-9pm)
- 📏 **Height Control**: Adjust vertical scale or enable compact mode to fit screen
- 🎯 **Concurrent Events**: Events at the same time display side-by-side
- 📌 **All-Day Events**: Displayed at top of day with dynamic height allocation
- 🔢 **Smart Sorting**: All-day events first, then chronological order by start time
- 📐 **Precise Positioning**: Events positioned at exact time slots with minute precision
- 🎛️ **Default View**: Set which view loads by default (month/week/schedule)
- 📏 **Compact Header**: Optional single-row header layout for space savings

## Installation

### HACS (Recommended)

1. Make sure [HACS](https://hacs.xyz/) is installed
2. In HACS, go to "Frontend"
3. Click the "+ Explore & Download Repositories" button
4. Search for "Skylight Calendar Card"
5. Click "Download"
6. Restart Home Assistant

### Manual Installation

1. Download `skylight-calendar-card.js` from the latest release
2. Copy it to `<config>/www/skylight-calendar-card.js`
3. Add the following to your Lovelace resources:
   ```yaml
   resources:
     - url: /local/skylight-calendar-card.js
       type: module
   ```
4. Restart Home Assistant

## Usage

### Basic Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:skylight-calendar-card
title: Family Calendar
entities:
  - calendar.personal
  - calendar.work
  - calendar.family
```

### Advanced Configuration

```yaml
type: custom:skylight-calendar-card
title: Family Calendar
entities:
  - calendar.personal
  - calendar.work
  - calendar.family
  - calendar.kids_activities
default_view: week-standard  # Load this view by default
header_color: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'  # Custom blue gradient
first_day_of_week: 0  # 0 = Sunday, 1 = Monday, etc.
show_week_numbers: false
max_events: 100
view_mode: month  # 'month', 'week-compact', or 'week-standard'
week_days: [0, 1, 2, 3, 4, 5, 6]  # Days to show in week views (0=Sun, 6=Sat)
week_start_hour: 8  # Start hour for week-standard view
week_end_hour: 21   # End hour for week-standard view (9pm = 21)
height_scale: 0.6   # Make schedule more compact (50-200%)
compact_height: true  # Fit to screen with scrolling
compact_header: true  # Single-row header layout
colors:
  calendar.personal: '#FF6B6B'
  calendar.work: '#4ECDC4'
  calendar.family: '#45B7D1'
  calendar.kids_activities: '#FFA07A'
```

### Rolling Days Mode

Instead of showing a fixed week, you can show "today + N days":

```yaml
type: custom:skylight-calendar-card
title: Next 7 Days
entities:
  - calendar.family
default_view: week-standard
rolling_days: 6  # Show today + 6 more days = 7 total days
week_start_hour: 6
week_end_hour: 22
height_scale: 0.5
compact_height: true
```

This mode is perfect for:
- Always showing upcoming events regardless of week boundaries
- Custom date ranges (3 days, 10 days, etc.)
- Scrolling through time in custom increments

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `'Family Calendar'` | Card title displayed in header |
| `entities` | list | **Required** | List of calendar entity IDs |
| `view_mode` | string | `'month'` | View mode: `'month'`, `'week-compact'`, or `'week-standard'` |
| `default_view` | string | `null` | Initial view mode on load (overrides view_mode) |
| `header_color` | string | `'var(--primary-color)'` | Custom header background (solid color or gradient) |
| `first_day_of_week` | integer | `0` | First day of week (0 = Sunday, 1 = Monday, etc.) |
| `week_days` | list | `[0,1,2,3,4,5,6]` | Days to show in week views (0=Sun, 6=Sat) |
| `rolling_days` | integer | `null` | Show today + N days (alternative to week_days) |
| `week_start_hour` | integer | `8` | Start hour for week-standard view (0-23) |
| `week_end_hour` | integer | `21` | End hour for week-standard view (0-23) |
| `height_scale` | float | `1.0` | Height scaling factor (0.5-2.0, affects schedule view) |
| `compact_height` | boolean | `false` | Fit calendar to screen height with scroll |
| `compact_header` | boolean | `false` | Single-row header with inline badges |
| `show_week_numbers` | boolean | `false` | Show week numbers on the left side |
| `max_events` | integer | `100` | Maximum number of events to load |
| `colors` | map | auto | Custom colors for each calendar entity |

## Calendar Entity Setup

This card requires Home Assistant calendar entities. You can integrate calendars from:

- **Google Calendar**: [Integration Guide](https://www.home-assistant.io/integrations/google/)
- **CalDAV** (Apple Calendar, Nextcloud, etc.): [Integration Guide](https://www.home-assistant.io/integrations/caldav/)
- **Local Calendar**: [Integration Guide](https://www.home-assistant.io/integrations/local_calendar/)
- **Office 365**: [Integration Guide](https://www.home-assistant.io/integrations/microsoft/)

### Example Calendar Configuration

```yaml
# configuration.yaml
google:
  client_id: YOUR_CLIENT_ID
  client_secret: YOUR_CLIENT_SECRET
```

After setting up the integration, calendar entities will be automatically created (e.g., `calendar.personal`, `calendar.work`).

## Features in Detail

### View Modes

The card supports three different view modes that you can switch between using the buttons in the header:

#### Month View
The traditional calendar grid showing a full month at a time. Events are displayed as color-coded blocks within each day. Perfect for getting an overview of the entire month.

```yaml
view_mode: month
```

#### Week Compact View
Shows each day of the week as a column with events stacked vertically. This view is ideal for seeing all your week's events at a glance without the detailed timeline. You can configure which days to show:

```yaml
view_mode: week-compact
week_days: [1, 2, 3, 4, 5]  # Monday-Friday only
```

#### Week Standard (Schedule) View
Displays a detailed timeline view with hours on the left and days across the top. Events are positioned at their exact time slots. Perfect for detailed day planning:

```yaml
view_mode: week-standard
week_start_hour: 8   # Start at 8am
week_end_hour: 21    # End at 9pm
week_days: [1, 2, 3, 4, 5]  # Weekdays only
```

### Color-Coded Events

Each calendar entity can have its own color, making it easy to distinguish between different types of events:

```yaml
colors:
  calendar.personal: '#FF6B6B'    # Red for personal events
  calendar.work: '#4ECDC4'        # Teal for work events
  calendar.family: '#45B7D1'      # Blue for family events
  calendar.kids: '#FFA07A'        # Orange for kids' activities
```

### Customizing Header Color

By default, the header automatically matches your Home Assistant theme's primary color using `var(--primary-color)`. You can override this with any custom color or gradient:

**Solid Colors:**
```yaml
header_color: '#1e40af'  # Solid blue
header_color: '#059669'  # Solid green
header_color: '#dc2626'  # Solid red
```

**Gradients:**
```yaml
# Blue gradient
header_color: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'

# Green gradient
header_color: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'

# Orange/Red gradient
header_color: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)'

# Teal gradient
header_color: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)'

# Classic purple gradient (original default)
header_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
```

**Use Other Theme Variables:**
```yaml
# Use secondary color
header_color: 'var(--secondary-color)'

# Use accent color
header_color: 'var(--accent-color)'

# Dark background
header_color: 'var(--card-background-color)'
```

**Restore Default:**
```yaml
# Explicitly set to match theme (this is already the default)
header_color: 'var(--primary-color)'
```

### Concurrent Events

When multiple events happen at the same time in schedule view, they automatically display side-by-side instead of overlapping:

- Events are detected for overlaps using precise minute-based timing
- Each concurrent event gets its own column with appropriate width
- Non-overlapping events share columns for efficient use of space
- Visual layout matches professional calendar applications

### All-Day Events

All-day events are handled specially across all views:

- **Positioned first**: All-day events always appear before timed events
- **Dynamic height**: The all-day section automatically sizes to fit the busiest day
- **Consistent alignment**: All days show the same all-day section height
- **Hidden when empty**: If no all-day events exist in the visible range, the section is completely removed

### Event Sorting

Events are automatically sorted for optimal viewing:

1. **All-day events** appear first (top of list)
2. **Timed events** follow in chronological order by start time
3. Works consistently across all three view modes

### Event Details Modal

Click on any event to see:
- Event title
- Description
- Start and end time
- Location (if specified)

### Day View

Click on any day to see all events for that day in an organized list.

### Today Highlight

The current day is automatically highlighted with a blue background and the date number is shown in a blue circle.

### Navigation

- Click the arrow buttons to move between months
- Click "Today" to jump back to the current month

## Tips and Tricks

### Organizing Family Schedules

Create separate calendars for different family members:

```yaml
entities:
  - calendar.mom
  - calendar.dad
  - calendar.kid1
  - calendar.kid2
  - calendar.family_shared
```

### Color Coding by Category

Use colors to represent different types of activities:

```yaml
colors:
  calendar.appointments: '#FF6B6B'  # Red for appointments
  calendar.sports: '#4ECDC4'        # Teal for sports
  calendar.school: '#FFA07A'        # Orange for school
  calendar.social: '#98D8C8'        # Green for social events
```

### Adjusting Height for Different Screens

**Make it more compact:**
```yaml
height_scale: 0.7  # 70% of default height
```

**Make it larger:**
```yaml
height_scale: 1.5  # 150% of default height
```

**Fit to screen with scrolling:**
```yaml
compact_height: true  # Fits to viewport height
```

**Combine for best results:**
```yaml
height_scale: 0.6
compact_height: true
# Creates a compact view that fits perfectly in the available space
```

### Using Rolling Days Mode

Perfect for dynamic date ranges that don't follow calendar weeks:

```yaml
# Show next 3 days
rolling_days: 2  # Today + 2 = 3 days

# Show next 10 days
rolling_days: 9  # Today + 9 = 10 days

# Show just today
rolling_days: 0  # Today only
```

Navigation buttons will advance by the number of days shown (rolling_days + 1).

### Setting Default View

Load the card in your preferred view automatically:

```yaml
default_view: 'week-standard'  # Always open in schedule view
```

This is especially useful when you primarily use one view mode but want the ability to switch to others.

### Compact Header Mode

Save vertical space with the single-row header:

```yaml
compact_header: true
```

This shows the title, calendar badges, and view controls all in one row, perfect for smaller screens or when maximizing calendar space.

### Interactive Features

- **Click calendar badges** at the top to show/hide that calendar's events
- **Click any event** to see full details including duration, location, description, and attendees
- **Click days** in month view to see all events for that day

### Multiple Cards

You can add multiple cards for different views:
- One for the whole family
- One for work schedules
- One for kids' activities

## Troubleshooting

### Events Not Showing

1. Make sure your calendar integration is working correctly
2. Check that the entity ID is correct
3. Verify that the calendar has events in the current month
4. Check the Home Assistant logs for errors

### Colors Not Applied

Make sure you're using valid hex color codes (e.g., `#FF6B6B`, not `red`)

### Card Not Loading

1. Clear your browser cache
2. Check browser console for errors (F12)
3. Verify the resource is properly added to Lovelace

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/superdingo101/skylight-calendar-card.git
cd skylight-calendar-card

# The main file is ready to use
cp skylight-calendar-card.js /config/www/
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you find this card useful, please star the repository! ⭐

For issues and feature requests, please use the [GitHub Issues](https://github.com/superdingo101/skylight-calendar-card/issues) page.

## License

MIT License - see LICENSE file for details

## Credits

Inspired by the beautiful design of [Skylight Calendar](https://www.skylightframe.com/calendar).

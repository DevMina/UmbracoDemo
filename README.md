# Umbraco 13.9.3 with SQLite

This is a new Umbraco 13.9.3 project configured to use SQLite as the database.

## Prerequisites

- .NET 8.0 SDK or later
- Node.js (for frontend assets)

## Getting Started

1. **Restore dependencies**
   ```bash
   dotnet restore
   ```

2. **Run the application**
   ```bash
   dotnet run
   ```

3. **Access the Umbraco backoffice**
   - Open your browser and navigate to: `https://localhost:5001/umbraco`
   - Complete the installation wizard when prompted
   - The SQLite database will be created automatically at `umbraco.db`

## Project Structure

- `/wwwroot` - Static files (CSS, JS, images)
- `/umbraco` - Umbraco backoffice
- `/umbraco/App_Data` - Contains the SQLite database file after first run

## Configuration

- Database: SQLite (configured in `appsettings.json`)
- Database file: `umbraco.db` (created automatically)

## Development

To run in development mode with hot reload:
```bash
dotnet watch run
```

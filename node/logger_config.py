import os
import logging
import time
from logging.handlers import RotatingFileHandler
import json

class CustomFormatter(logging.Formatter):
    """Custom formatter with color output for console"""
    
    COLORS = {
        'DEBUG': '\033[94m',     # Blue
        'INFO': '\033[92m',      # Green
        'WARNING': '\033[93m',   # Yellow
        'ERROR': '\033[91m',     # Red
        'CRITICAL': '\033[95m',  # Purple
        'RESET': '\033[0m'       # Reset color
    }
    
    def format(self, record):
        log_message = super().format(record)
        if hasattr(record, 'color') and not record.color:
            return log_message
        
        levelname = record.levelname
        if levelname in self.COLORS:
            return f"{self.COLORS[levelname]}{log_message}{self.COLORS['RESET']}"
        return log_message

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'name': record.name,
            'message': record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
            
        # Add any custom fields from the record
        for key, value in record.__dict__.items():
            if key not in ['args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
                          'funcName', 'id', 'levelname', 'levelno', 'lineno', 'module',
                          'msecs', 'message', 'msg', 'name', 'pathname', 'process',
                          'processName', 'relativeCreated', 'stack_info', 'thread', 'threadName']:
                log_data[key] = value
                
        return json.dumps(log_data)

def setup_logger(name, log_dir=None, node_id=None):
    """Set up logger with both console and file handlers"""
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # Capture all levels
    
    # Prevent adding handlers multiple times
    if logger.handlers:
        return logger
        
    # Create console handler with color formatting
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)  # Only INFO and above to console
    console_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    console_formatter = CustomFormatter(console_format)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # If log directory is provided, create file handler
    if log_dir:
        # Create log directory if it doesn't exist
        node_specific_dir = os.path.join(log_dir, node_id) if node_id else log_dir
        os.makedirs(node_specific_dir, exist_ok=True)
        
        # Standard log file (human-readable)
        log_file = os.path.join(node_specific_dir, f"{name.replace('.', '_')}.log")
        file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
        file_handler.setLevel(logging.DEBUG)  # All levels to file
        file_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s - [%(filename)s:%(lineno)d]'
        file_handler.setFormatter(logging.Formatter(file_format))
        logger.addHandler(file_handler)
        
        # JSON log file (for potential integration with Solr)
        json_log_file = os.path.join(node_specific_dir, f"{name.replace('.', '_')}_json.log")
        json_handler = RotatingFileHandler(json_log_file, maxBytes=10*1024*1024, backupCount=5)
        json_handler.setLevel(logging.DEBUG)  # All levels to JSON file
        json_handler.setFormatter(JSONFormatter())
        logger.addHandler(json_handler)
        
    return logger
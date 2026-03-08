import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./http-exception.filter";

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
}

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let mockResponse: Record<string, jest.Mock>;
  let mockRequest: Record<string, unknown>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: "GET",
      url: "/api/test",
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it("should handle HttpException with correct status", () => {
    const exception = new HttpException("Not Found", HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        path: "/api/test",
      }),
    );
  });

  it("should handle HttpException with object response", () => {
    const exception = new HttpException(
      { message: "Validation failed", errors: ["name is required"] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Validation failed",
      }),
    );
  });

  it("should handle non-HttpException as 500 Internal Server Error", () => {
    const exception = new Error("Something unexpected happened");

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      }),
    );
  });

  it("should handle non-Error exceptions as 500", () => {
    filter.catch("string exception", mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it("should include timestamp in the response", () => {
    const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const jsonArg = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
    expect(jsonArg.timestamp).toBeDefined();
    expect(new Date(jsonArg.timestamp).getTime()).not.toBeNaN();
  });
});
